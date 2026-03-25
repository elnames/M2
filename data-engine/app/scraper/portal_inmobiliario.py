import asyncio, logging, re
from typing import List

logger = logging.getLogger(__name__)

COMUNAS_TARGET = ['macul', 'nunoa', 'santiago', 'providencia', 'san-miguel']

COMUNAS_URL = {
    'macul': 'macul',
    'nunoa': 'nunoa',
    'santiago': 'santiago',
    'providencia': 'providencia',
    'san-miguel': 'san-miguel',
}

async def scrape_listings(comuna: str, max_pages: int = 3) -> List[dict]:
    try:
        from playwright.async_api import async_playwright
        return await _scrape_with_playwright(comuna, max_pages)
    except ImportError:
        logger.warning('Playwright no disponible, usando httpx')
        return await _scrape_with_httpx(comuna, max_pages)
    except Exception as e:
        logger.error('Error Playwright en %s: %s', comuna, e)
        return []

async def _scrape_with_playwright(comuna: str, max_pages: int) -> List[dict]:
    results = []
    slug = COMUNAS_URL.get(comuna, comuna)
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page()
        await page.set_extra_http_headers({'Accept-Language': 'es-CL,es;q=0.9'})
        for pg in range(1, max_pages + 1):
            url = f'https://www.portalinmobiliario.com/venta/inmuebles/{slug}-metropolitana/_Desde_{(pg-1)*48+1}'
            try:
                await page.goto(url, wait_until='networkidle', timeout=30000)
                await page.wait_for_timeout(2000)
                content = await page.content()
                items = _parse_html(content, 'portalinmobiliario')
                if not items:
                    break
                results.extend(items)
                logger.info('    Playwright %s pg%d: %d items', comuna, pg, len(items))
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('    Playwright pag %d %s: %s', pg, comuna, e)
                break
        await browser.close()
    return results

async def _scrape_with_httpx(comuna: str, max_pages: int) -> List[dict]:
    import httpx
    results = []
    slug = COMUNAS_URL.get(comuna, comuna)
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-CL,es;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
    }
    async with httpx.AsyncClient(headers=headers, timeout=20, follow_redirects=True) as client:
        for pg in range(1, max_pages + 1):
            url = f'https://www.portalinmobiliario.com/venta/inmuebles/{slug}-metropolitana/_Desde_{(pg-1)*48+1}'
            try:
                r = await client.get(url)
                items = _parse_html(r.text, 'portalinmobiliario')
                if not items:
                    break
                results.extend(items)
                await asyncio.sleep(2)
            except Exception as e:
                logger.error('httpx %s pg%d: %s', comuna, pg, e)
    return results

def _parse_html(html: str, fuente: str) -> List[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    results = []

    # Intentar múltiples selectores (el portal cambia estructura)
    selectors = [
        'li.ui-search-layout__item',
        'div.poly-card',
        '[class*="property-card"]',
        '[class*="listing-item"]',
        'article[class*="card"]',
    ]

    cards = []
    for sel in selectors:
        cards = soup.select(sel)
        if cards:
            break

    for card in cards[:48]:
        try:
            # --- URL: buscar el primer enlace con href absoluto o relativo al portal ---
            url = ''
            for a in card.find_all('a', href=True):
                href = a.get('href', '')
                # Acepta URLs que apunten a un listing (contienen /MLC- o /inmueble o son del dominio)
                if href.startswith('https://www.portalinmobiliario.com') or re.search(r'/MLC-\d+', href):
                    url = href if href.startswith('http') else 'https://www.portalinmobiliario.com' + href
                    break
                elif href.startswith('/') and len(href) > 5:
                    url = 'https://www.portalinmobiliario.com' + href
                    break
            # Descartar si la URL no es un listing real (evita el home del portal)
            if not url or url.rstrip('/') in ('https://www.portalinmobiliario.com', 'https://portalinmobiliario.com'):
                continue

            # --- Título ---
            title_tag = card.find(['h2', 'h3'])
            if not title_tag:
                title_tag = card.find('a', href=True)
            titulo = title_tag.get_text(strip=True)[:300] if title_tag else 'Propiedad'

            precio_text = card.get_text()

            # --- Precio UF: solo aceptar el PRIMERO que aparezca con patrón "UF X.XXX" ---
            # Formato chileno: UF 2.350 ó 2.350 UF (el punto es separador de miles)
            uf_matches = re.findall(r'(?:UF\s*([\d]{1,3}(?:[\.,]\d{3})*(?:[.,]\d+)?)\b|\b([\d]{1,3}(?:[\.,]\d{3})*(?:[.,]\d+)?)\s*UF)', precio_text)
            precio_uf = None
            for m in uf_matches:
                raw = m[0] or m[1]
                # Normalizar: eliminar puntos de miles, convertir coma decimal a punto
                # Heurística: si >2 dígitos tras separador final → es decimal (coma), si no → miles
                normalized = raw.replace('.', '').replace(',', '.')
                val = float(normalized)
                # Ventas de inmuebles en Chile: rango real 500 – 50.000 UF
                if 500 <= val <= 50000:
                    precio_uf = val
                    break
            if precio_uf is None:
                continue

            # --- m2 construidos ---
            m2_match = re.search(r'(\d+(?:[.,]\d+)?)\s*m[²2]', precio_text)
            m2 = float(m2_match.group(1).replace(',', '.')) if m2_match else None
            if not m2 or m2 < 15 or m2 > 2000:
                continue

            # --- Validación UF/m²: rango plausible para Santiago (20–400 UF/m²) ---
            uf_por_m2 = precio_uf / m2
            if not (20 <= uf_por_m2 <= 400):
                logger.debug('Descartando precio_uf=%.1f m2=%.1f (%.2f UF/m²) url=%s', precio_uf, m2, uf_por_m2, url)
                continue

            tipo = 'departamento' if 'departamento' in titulo.lower() else 'casa'
            results.append({
                'titulo': titulo,
                'precio_uf': round(precio_uf, 2),
                'm2': round(m2, 1),
                'comuna': fuente,
                'tipo': tipo,
                'url': url[:500],
                'fuente': fuente,
            })
        except Exception:
            continue
    return results
