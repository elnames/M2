"""
Scraper de PortalInmobiliario.com
==================================
Playwright (primario): usa element.evaluate("node => node.href") para obtener
la URL absoluta resuelta por el navegador — sin concatenar IDs a mano.

httpx + BeautifulSoup (fallback): solo cuando Playwright no está disponible.
"""

import asyncio, logging, re
from typing import List

logger = logging.getLogger(__name__)

COMUNAS_TARGET = [
    'macul', 'nunoa', 'santiago', 'providencia', 'san-miguel',
    'las-condes', 'la-florida', 'maipu', 'la-reina', 'vitacura',
]

COMUNAS_URL = {
    'macul':       'macul',
    'nunoa':       'nunoa',
    'ñuñoa':       'nunoa',
    'santiago':    'santiago',
    'providencia': 'providencia',
    'san-miguel':  'san-miguel',
    'las-condes':  'las-condes',
    'la-florida':  'la-florida',
    'maipu':       'maipu',
    'la-reina':    'la-reina',
    'vitacura':    'vitacura',
}

# Selectores de tarjetas de propiedad (el portal cambia estructura periódicamente)
_CARD_SELECTORS = [
    'li.ui-search-layout__item',
    'div.poly-card',
    '[class*="property-card"]',
    '[class*="listing-item"]',
    'article[class*="card"]',
]

# Patrones de URL que indican un listing real (no el home ni páginas de búsqueda)
_LISTING_PATTERN = re.compile(
    r'portalinmobiliario\.com/.+/(MLC|inmueble|departamento|casa|oficina)',
    re.IGNORECASE
)


async def scrape_listings(comuna: str, max_pages: int = 3) -> List[dict]:
    try:
        from playwright.async_api import async_playwright  # noqa: F401
        logger.info('[portal] Usando Playwright para %s', comuna)
        return await _scrape_with_playwright(comuna, max_pages)
    except ImportError:
        logger.warning('[portal] Playwright no disponible, usando httpx fallback para %s', comuna)
        return await _scrape_with_httpx(comuna, max_pages)
    except Exception as e:
        logger.error('[portal] Error Playwright en %s: %s — cayendo a httpx', comuna, e, exc_info=True)
        return await _scrape_with_httpx(comuna, max_pages)


# ─── Playwright (primario) ────────────────────────────────────────────────────

async def _scrape_with_playwright(comuna: str, max_pages: int) -> List[dict]:
    slug = COMUNAS_URL.get(comuna.lower(), comuna.lower().replace(' ', '-'))
    results = []
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        )
        page = await browser.new_page()
        await page.set_extra_http_headers({'Accept-Language': 'es-CL,es;q=0.9'})

        for pg in range(1, max_pages + 1):
            list_url = (
                f'https://www.portalinmobiliario.com/venta/inmuebles'
                f'/{slug}-metropolitana/_Desde_{(pg - 1) * 48 + 1}'
            )
            try:
                await page.goto(list_url, wait_until='networkidle', timeout=30_000)
                await page.wait_for_timeout(2_000)

                items = await _extract_playwright(page, comuna)
                if not items:
                    logger.info('[portal] Playwright %s pg%d: sin resultados, detener', comuna, pg)
                    break
                results.extend(items)
                logger.info('[portal] Playwright %s pg%d: %d items', comuna, pg, len(items))
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('[portal] Playwright pg%d %s: %s', pg, comuna, e)
                break

        await browser.close()
    return results


async def _extract_playwright(page, comuna: str) -> List[dict]:
    """
    Extrae propiedades usando Playwright DOM API.
    La URL se obtiene con element.evaluate("node => node.href") para garantizar
    que sea la URL absoluta y SEO-friendly resuelta por el navegador,
    sin concatenar IDs a mano.
    """
    results = []

    # Localizar tarjetas
    cards = []
    for sel in _CARD_SELECTORS:
        cards = await page.query_selector_all(sel)
        if cards:
            break

    for card in cards[:48]:
        try:
            # ── URL absoluta vía evaluación DOM ──────────────────────────────
            # Buscar primero el anchor específico de un listing de PI
            anchor = await card.query_selector(
                'a[href*="portalinmobiliario.com"], '
                'a[href*="/MLC-"], '
                'a[href*="/venta/"], '
                'a[href*="/departamento/"], '
                'a[href*="/casa/"]'
            )
            if not anchor:
                anchor = await card.query_selector('a[href]')
            if not anchor:
                continue

            # ✅ CORRECTO: el navegador resuelve la URL completa (slug SEO incluido)
            # ❌ PROHIBIDO: get_attribute('href') devuelve el valor crudo del HTML
            url: str = await anchor.evaluate("node => node.href")

            if not url or 'portalinmobiliario.com' not in url:
                continue
            # Descartar si apunta al home o a la búsqueda (no a un listing)
            if url.rstrip('/') in (
                'https://www.portalinmobiliario.com',
                'https://portalinmobiliario.com',
            ):
                continue

            # ── Texto plano de la tarjeta para precio y m² ───────────────────
            text = await card.inner_text()

            # ── Precio en UF ─────────────────────────────────────────────────
            precio_uf = _parse_precio_uf(text)
            if precio_uf is None:
                continue

            # ── m² ───────────────────────────────────────────────────────────
            m2 = _parse_m2(text)
            if m2 is None:
                continue

            # ── Validación UF/m² ─────────────────────────────────────────────
            uf_m2 = precio_uf / m2
            if not (20 <= uf_m2 <= 400):
                continue

            # ── Título ───────────────────────────────────────────────────────
            h_el = await card.query_selector('h2, h3, [class*="title"]')
            titulo = (await h_el.inner_text()).strip()[:300] if h_el else 'Propiedad en venta'

            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'
            results.append({
                'titulo':    titulo,
                'precio_uf': round(precio_uf, 2),
                'm2':        round(m2, 1),
                'comuna':    _normalizar_comuna(comuna),
                'tipo':      tipo,
                'url':       url[:500],
                'fuente':    'portalinmobiliario',
            })
        except Exception as ex:
            logger.debug('[portal] Skip tarjeta: %s', ex)
            continue

    return results


# ─── httpx + BeautifulSoup (fallback) ────────────────────────────────────────

async def _scrape_with_httpx(comuna: str, max_pages: int) -> List[dict]:
    import httpx
    slug = COMUNAS_URL.get(comuna.lower(), comuna.lower().replace(' ', '-'))
    results = []
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
            'Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept-Language': 'es-CL,es;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
    }
    async with httpx.AsyncClient(headers=headers, timeout=20, follow_redirects=True) as client:
        for pg in range(1, max_pages + 1):
            list_url = (
                f'https://www.portalinmobiliario.com/venta/inmuebles'
                f'/{slug}-metropolitana/_Desde_{(pg - 1) * 48 + 1}'
            )
            try:
                r = await client.get(list_url)
                items = _parse_html_bs(r.text, comuna)
                if not items:
                    break
                results.extend(items)
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('[portal] httpx %s pg%d: %s', comuna, pg, e)
    return results


def _parse_html_bs(html: str, comuna: str) -> List[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    results = []
    cards = []
    for sel in _CARD_SELECTORS:
        cards = soup.select(sel)
        if cards:
            break

    for card in cards[:48]:
        try:
            url = ''
            for a in card.find_all('a', href=True):
                href = a.get('href', '')
                # En BeautifulSoup no tenemos el navegador; construimos la URL
                # a partir del href pero solo si tiene el slug SEO (no solo MLC-ID)
                if href.startswith('https://www.portalinmobiliario.com'):
                    candidate = href
                elif href.startswith('/'):
                    candidate = 'https://www.portalinmobiliario.com' + href
                else:
                    continue
                # Rechazar si solo es el home
                if candidate.rstrip('/') in (
                    'https://www.portalinmobiliario.com',
                    'https://portalinmobiliario.com',
                ):
                    continue
                url = candidate
                break

            if not url:
                continue

            text = card.get_text(' ', strip=True)
            precio_uf = _parse_precio_uf(text)
            if precio_uf is None:
                continue
            m2 = _parse_m2(text)
            if m2 is None:
                continue
            if not (20 <= precio_uf / m2 <= 400):
                continue

            h_tag = card.find(['h2', 'h3'])
            titulo = h_tag.get_text(strip=True)[:300] if h_tag else 'Propiedad en venta'
            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'

            results.append({
                'titulo':    titulo,
                'precio_uf': round(precio_uf, 2),
                'm2':        round(m2, 1),
                'comuna':    _normalizar_comuna(comuna),
                'tipo':      tipo,
                'url':       url[:500],
                'fuente':    'portalinmobiliario',
            })
        except Exception:
            continue
    return results


# ─── Helpers compartidos ──────────────────────────────────────────────────────

def _parse_precio_uf(text: str) -> float | None:
    """
    Extrae precio en UF del texto de la tarjeta.
    Solo acepta valores en rango de venta real Santiago: 500–50.000 UF.
    Descarta precios en CLP que podrían venir como "12 UF" (error de scraping).
    """
    matches = re.findall(
        r'(?:UF\s*([\d]{1,3}(?:[\.,]\d{3})*(?:[.,]\d+)?)'
        r'|\b([\d]{1,3}(?:[\.,]\d{3})*(?:[.,]\d+)?)\s*UF)',
        text,
    )
    for m in matches:
        raw = m[0] or m[1]
        normalized = raw.replace('.', '').replace(',', '.')
        try:
            val = float(normalized)
            if 500 <= val <= 50_000:
                return val
        except ValueError:
            continue
    return None


def _parse_m2(text: str) -> float | None:
    """Extrae m² del texto. Solo acepta 15–2000 m²."""
    m = re.search(r'(\d+(?:[.,]\d+)?)\s*m[²2]', text)
    if not m:
        return None
    try:
        val = float(m.group(1).replace(',', '.'))
        return val if 15 <= val <= 2000 else None
    except ValueError:
        return None


def _normalizar_comuna(raw: str) -> str:
    """Capitaliza y limpia el nombre de la comuna para consistencia en BD."""
    return raw.replace('-', ' ').title()
