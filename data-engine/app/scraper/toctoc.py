"""
Scraper de TocToc.com
======================
Bug anterior: se armaba la URL como f"https://www.toctoc.com/propiedades/{id}"
(ruta sin slug SEO → 404).

Fix: element.evaluate("node => node.href") entrega la URL completa con slug que
el navegador ya resolvió, como:
  https://www.toctoc.com/propiedades/venta-departamentos/providencia/depto-2d-90m2-123456
"""

import asyncio, logging, re
from typing import List
from .portal_inmobiliario import _parse_precio_uf, _parse_m2, _normalizar_comuna

logger = logging.getLogger(__name__)

# Comunas habilitadas con su slug en TocToc
COMUNAS_TOCTOC: dict[str, str] = {
    'santiago':    'santiago',
    'providencia': 'providencia',
    'las-condes':  'las-condes',
    'nunoa':       'nunoa',
    'macul':       'macul',
    'san-miguel':  'san-miguel',
    'la-florida':  'la-florida',
    'maipu':       'maipu',
    'la-reina':    'la-reina',
    'vitacura':    'vitacura',
}

# Selectores de tarjeta en TocToc (actualizar si cambia el markup)
_CARD_SELECTORS = [
    'article.listing-card',
    'div[class*="listing-card"]',
    'div[class*="property-card"]',
    'li[class*="listing"]',
    'article[class*="card"]',
]

# El anchor principal de la tarjeta en TocToc suele tener estas clases/atributos
_ANCHOR_SELECTORS = [
    'a[href*="/propiedades/venta"]',
    'a[href*="/propiedades/arriendo"]',
    'a[class*="card-link"]',
    'a[class*="listing-link"]',
    'a[class*="property-link"]',
    'a[href*="toctoc.com"]',
]


async def scrape_listings(comuna: str, max_pages: int = 3) -> List[dict]:
    try:
        from playwright.async_api import async_playwright  # noqa: F401
        return await _scrape_with_playwright(comuna, max_pages)
    except ImportError:
        logger.warning('[toctoc] Playwright no disponible, usando httpx fallback')
        return await _scrape_with_httpx(comuna, max_pages)
    except Exception as e:
        logger.error('[toctoc] Error en %s: %s', comuna, e)
        return []


# ─── Playwright (primario) ────────────────────────────────────────────────────

async def _scrape_with_playwright(comuna: str, max_pages: int) -> List[dict]:
    slug = COMUNAS_TOCTOC.get(comuna.lower(), comuna.lower().replace(' ', '-'))
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
                f'https://www.toctoc.com/propiedades/venta-de-propiedades'
                f'/region-metropolitana/{slug}?page={pg}'
            )
            try:
                await page.goto(list_url, wait_until='networkidle', timeout=30_000)
                await page.wait_for_timeout(2_500)

                items = await _extract_playwright(page, comuna)
                if not items:
                    logger.info('[toctoc] %s pg%d: sin resultados, detener', comuna, pg)
                    break
                results.extend(items)
                logger.info('[toctoc] %s pg%d: %d items', comuna, pg, len(items))
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('[toctoc] pg%d %s: %s', pg, comuna, e)
                break

        await browser.close()
    return results


async def _extract_playwright(page, comuna: str) -> List[dict]:
    """
    Extrae propiedades de TocToc usando Playwright DOM API.

    Bug anterior:
        id = card.get_attribute('data-id')
        url = f"https://www.toctoc.com/propiedades/{id}"   ← 404

    Fix aplicado:
        url = await anchor.evaluate("node => node.href")   ← URL SEO completa
    """
    results = []

    cards = []
    for sel in _CARD_SELECTORS:
        cards = await page.query_selector_all(sel)
        if cards:
            break

    for card in cards[:40]:
        try:
            # ── URL absoluta resuelta por el navegador ────────────────────────
            anchor = None
            for a_sel in _ANCHOR_SELECTORS:
                anchor = await card.query_selector(a_sel)
                if anchor:
                    break
            if not anchor:
                anchor = await card.query_selector('a[href]')
            if not anchor:
                continue

            # ✅ node.href → URL absoluta con slug SEO completo
            # ❌ get_attribute('href') → puede devolver path relativo sin slug
            url: str = await anchor.evaluate("node => node.href")

            if not url or 'toctoc.com' not in url:
                continue
            # Descartar home, buscador o perfil de agente
            if _is_non_listing_url(url):
                continue

            # ── Texto de la tarjeta ───────────────────────────────────────────
            text = await card.inner_text()

            # ── Precio en UF ─────────────────────────────────────────────────
            precio_uf = _parse_precio_uf(text)
            if precio_uf is None:
                continue

            # ── m² ───────────────────────────────────────────────────────────
            m2 = _parse_m2(text)
            if m2 is None:
                continue

            if not (20 <= precio_uf / m2 <= 400):
                continue

            # ── Título ───────────────────────────────────────────────────────
            h_el = await card.query_selector('h2, h3, [class*="title"], [class*="name"]')
            titulo = (await h_el.inner_text()).strip()[:300] if h_el else 'Propiedad TocToc'
            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'

            results.append({
                'titulo':    titulo,
                'precio_uf': round(precio_uf, 2),
                'm2':        round(m2, 1),
                'comuna':    _normalizar_comuna(comuna),
                'tipo':      tipo,
                'url':       url[:500],
                'fuente':    'toctoc',
            })
        except Exception as ex:
            logger.debug('[toctoc] Skip tarjeta: %s', ex)
            continue

    return results


# ─── httpx + BeautifulSoup (fallback) ────────────────────────────────────────

async def _scrape_with_httpx(comuna: str, max_pages: int) -> List[dict]:
    import httpx
    slug = COMUNAS_TOCTOC.get(comuna.lower(), comuna.lower().replace(' ', '-'))
    results = []
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
            'Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept-Language': 'es-CL,es;q=0.9',
    }
    async with httpx.AsyncClient(headers=headers, timeout=20, follow_redirects=True) as client:
        for pg in range(1, max_pages + 1):
            list_url = (
                f'https://www.toctoc.com/propiedades/venta-de-propiedades'
                f'/region-metropolitana/{slug}?page={pg}'
            )
            try:
                r = await client.get(list_url)
                items = _parse_html_bs(r.text, comuna)
                if not items:
                    break
                results.extend(items)
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('[toctoc] httpx %s pg%d: %s', comuna, pg, e)
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

    for card in cards[:40]:
        try:
            url = ''
            for a in card.find_all('a', href=True):
                href = a.get('href', '')
                if href.startswith('https://www.toctoc.com/propiedades/venta'):
                    url = href
                    break
                elif href.startswith('/propiedades/venta'):
                    url = 'https://www.toctoc.com' + href
                    break
            if not url or _is_non_listing_url(url):
                continue

            text = card.get_text(' ', strip=True)
            precio_uf = _parse_precio_uf(text)
            if precio_uf is None:
                continue
            m2 = _parse_m2(text)
            if m2 is None or not (20 <= precio_uf / m2 <= 400):
                continue

            h_tag = card.find(['h2', 'h3'])
            titulo = h_tag.get_text(strip=True)[:300] if h_tag else 'Propiedad TocToc'
            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'

            results.append({
                'titulo':    titulo,
                'precio_uf': round(precio_uf, 2),
                'm2':        round(m2, 1),
                'comuna':    _normalizar_comuna(comuna),
                'tipo':      tipo,
                'url':       url[:500],
                'fuente':    'toctoc',
            })
        except Exception:
            continue
    return results


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _is_non_listing_url(url: str) -> bool:
    """Devuelve True si la URL apunta al home, buscador o perfil de agente."""
    non_listing = (
        'toctoc.com/propiedades/venta-de-propiedades',  # es la búsqueda, no un listing
        'toctoc.com/agentes',
        'toctoc.com/inmobiliaria',
        'toctoc.com/corredor',
    )
    clean = url.rstrip('/')
    if clean in ('https://www.toctoc.com', 'https://toctoc.com'):
        return True
    return any(pat in url for pat in non_listing if '?' not in url or url.index('?') > url.index(pat))
