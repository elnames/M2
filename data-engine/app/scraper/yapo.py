"""
Scraper de Yapo.cl
===================
Bug anterior: se extraía el anchor del perfil del vendedor/inmobiliaria
en lugar del anchor de la publicación:
  ❌ https://www.yapo.cl/inmobiliaria/nombre-empresa   (perfil)
  ❌ https://www.yapo.cl/corredor/nombre-corredor       (perfil)

Fix: se usa element.evaluate("node => node.href") sobre el anchor
principal de la tarjeta (el que lleva a la ficha de la propiedad),
descartando explícitamente los anchors de perfil de vendedor.
"""

import asyncio, logging, re
from typing import List
from .portal_inmobiliario import _parse_precio_uf, _parse_m2, _normalizar_comuna

logger = logging.getLogger(__name__)

# Yapo usa slugs de región/tipo para las búsquedas
COMUNAS_YAPO: dict[str, str] = {
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

_CARD_SELECTORS = [
    'li[class*="listing"]',
    'article[class*="listing"]',
    'div[class*="listing-card"]',
    'li[class*="ad-listing"]',
    'div[class*="ad-card"]',
]

# Patrones de URLs que indican PERFIL DE VENDEDOR → ignorar
_SELLER_PROFILE_PATTERNS = (
    '/inmobiliaria/',
    '/corredor/',
    '/agente/',
    '/empresa/',
    '/usuario/',
    'yapo.cl/u/',
)

# El anchor de la publicación suele apuntar a /region-metropolitana/... o /item/
_LISTING_PATTERNS = (
    '/region-metropolitana/',
    '/item/',
    '/departamentos-en-venta/',
    '/casas-en-venta/',
    '/propiedades/',
)


async def scrape_listings(comuna: str, max_pages: int = 3) -> List[dict]:
    try:
        from playwright.async_api import async_playwright  # noqa: F401
        return await _scrape_with_playwright(comuna, max_pages)
    except ImportError:
        logger.warning('[yapo] Playwright no disponible, usando httpx fallback')
        return await _scrape_with_httpx(comuna, max_pages)
    except Exception as e:
        logger.error('[yapo] Error en %s: %s', comuna, e)
        return []


# ─── Playwright (primario) ────────────────────────────────────────────────────

async def _scrape_with_playwright(comuna: str, max_pages: int) -> List[dict]:
    slug = COMUNAS_YAPO.get(comuna.lower(), comuna.lower().replace(' ', '-'))
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
            # Yapo pagina con offset: página 1 = sin parámetro, página 2+ = ?o=20, ?o=40...
            offset = (pg - 1) * 20
            list_url = (
                f'https://www.yapo.cl/region-metropolitana/departamentos-en-venta/'
                f'{slug}'
                + (f'?o={offset}' if offset > 0 else '')
            )
            try:
                await page.goto(list_url, wait_until='networkidle', timeout=30_000)
                await page.wait_for_timeout(2_500)

                items = await _extract_playwright(page, comuna)
                if not items:
                    logger.info('[yapo] %s pg%d: sin resultados, detener', comuna, pg)
                    break
                results.extend(items)
                logger.info('[yapo] %s pg%d: %d items', comuna, pg, len(items))
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('[yapo] pg%d %s: %s', pg, comuna, e)
                break

        await browser.close()
    return results


async def _extract_playwright(page, comuna: str) -> List[dict]:
    """
    Extrae publicaciones de Yapo usando Playwright DOM API.

    Bug anterior:
        # Tomaba el anchor del perfil del vendedor en lugar de la ficha:
        anchor = await card.query_selector('a[href*="/inmobiliaria/"]')
        url = await anchor.get_attribute('href')   ← perfil, no publicación

    Fix aplicado:
        1. Se excluyen explícitamente los anchors de perfil de vendedor.
        2. Se usa node.href para obtener la URL absoluta resuelta por el navegador.
    """
    results = []

    cards = []
    for sel in _CARD_SELECTORS:
        cards = await page.query_selector_all(sel)
        if cards:
            break

    for card in cards[:40]:
        try:
            # ── Buscar el anchor de la PUBLICACIÓN (no el del vendedor) ──────
            url = await _find_listing_anchor_url(card)
            if not url:
                continue

            # ── Texto de la tarjeta ───────────────────────────────────────────
            text = await card.inner_text()

            # ── Precio en UF ─────────────────────────────────────────────────
            precio_uf = _parse_precio_uf(text)
            if precio_uf is None:
                # Yapo a veces publica en CLP → intentar conversión aproximada
                precio_uf = _parse_clp_to_uf(text)
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
            titulo = (await h_el.inner_text()).strip()[:300] if h_el else 'Propiedad Yapo'
            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'

            results.append({
                'titulo':    titulo,
                'precio_uf': round(precio_uf, 2),
                'm2':        round(m2, 1),
                'comuna':    _normalizar_comuna(comuna),
                'tipo':      tipo,
                'url':       url[:500],
                'fuente':    'yapo',
            })
        except Exception as ex:
            logger.debug('[yapo] Skip tarjeta: %s', ex)
            continue

    return results


async def _find_listing_anchor_url(card) -> str | None:
    """
    Encuentra el anchor de la ficha de la propiedad dentro de la tarjeta,
    descartando explícitamente los anchors de perfil de vendedor.

    Retorna la URL absoluta (node.href) o None.
    """
    all_anchors = await card.query_selector_all('a[href]')
    for anchor in all_anchors:
        # ✅ node.href da la URL absoluta resuelta por el navegador
        url: str = await anchor.evaluate("node => node.href")

        if not url or 'yapo.cl' not in url:
            continue

        # ❌ Descartar anchors de perfil de vendedor
        if any(pat in url for pat in _SELLER_PROFILE_PATTERNS):
            continue

        # ✅ Aceptar si la URL apunta a una ficha de listing
        if any(pat in url for pat in _LISTING_PATTERNS):
            return url

    # Segundo intento: tomar el primer anchor que no sea perfil de vendedor
    for anchor in all_anchors:
        url: str = await anchor.evaluate("node => node.href")
        if url and 'yapo.cl' in url and not any(pat in url for pat in _SELLER_PROFILE_PATTERNS):
            return url

    return None


# ─── httpx + BeautifulSoup (fallback) ────────────────────────────────────────

async def _scrape_with_httpx(comuna: str, max_pages: int) -> List[dict]:
    import httpx
    slug = COMUNAS_YAPO.get(comuna.lower(), comuna.lower().replace(' ', '-'))
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
            offset = (pg - 1) * 20
            list_url = (
                f'https://www.yapo.cl/region-metropolitana/departamentos-en-venta/{slug}'
                + (f'?o={offset}' if offset > 0 else '')
            )
            try:
                r = await client.get(list_url)
                items = _parse_html_bs(r.text, comuna)
                if not items:
                    break
                results.extend(items)
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('[yapo] httpx %s pg%d: %s', comuna, pg, e)
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
                # Descartar perfiles de vendedor
                if any(pat in href for pat in _SELLER_PROFILE_PATTERNS):
                    continue
                if href.startswith('https://www.yapo.cl') and any(p in href for p in _LISTING_PATTERNS):
                    url = href
                    break
                elif href.startswith('/') and any(p in href for p in _LISTING_PATTERNS):
                    url = 'https://www.yapo.cl' + href
                    break
            if not url:
                continue

            text = card.get_text(' ', strip=True)
            precio_uf = _parse_precio_uf(text) or _parse_clp_to_uf(text)
            if precio_uf is None:
                continue
            m2 = _parse_m2(text)
            if m2 is None or not (20 <= precio_uf / m2 <= 400):
                continue

            h_tag = card.find(['h2', 'h3'])
            titulo = h_tag.get_text(strip=True)[:300] if h_tag else 'Propiedad Yapo'
            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'

            results.append({
                'titulo':    titulo,
                'precio_uf': round(precio_uf, 2),
                'm2':        round(m2, 1),
                'comuna':    _normalizar_comuna(comuna),
                'tipo':      tipo,
                'url':       url[:500],
                'fuente':    'yapo',
            })
        except Exception:
            continue
    return results


# ─── Helpers ──────────────────────────────────────────────────────────────────

# Valor de la UF para conversión aproximada desde CLP
# Se actualiza manualmente; el error es < 1% dado que la UF varía poco
_UF_APROX = 38_500.0


def _parse_clp_to_uf(text: str) -> float | None:
    """
    Intenta extraer un precio en CLP (pesos chilenos) y convertirlo a UF.
    Solo acepta el rango plausible de venta: 500–50.000 UF equivalentes.
    """
    # Patrones: "$150.000.000", "$ 90 millones", "CLP 45.000.000"
    patterns = [
        r'\$\s*([\d]{1,3}(?:[\.,]\d{3})+)',      # $150.000.000
        r'CLP\s*([\d]{1,3}(?:[\.,]\d{3})+)',     # CLP 45.000.000
        r'(\d+)\s*millones?\s*de\s*pesos',        # 90 millones de pesos
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if not m:
            continue
        raw = m.group(1).replace('.', '').replace(',', '')
        try:
            clp = float(raw)
            # "90 millones" viene como 90, convertir
            if clp < 1_000 and 'millon' in text.lower():
                clp *= 1_000_000
            uf_val = clp / _UF_APROX
            if 500 <= uf_val <= 50_000:
                return round(uf_val, 1)
        except ValueError:
            continue
    return None
