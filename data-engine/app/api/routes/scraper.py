from fastapi import APIRouter, BackgroundTasks
from app.core.database import SessionLocal
from app.core.models import Property, Valuation
from app.scraper.portal_inmobiliario import scrape_listings, COMUNAS_TARGET
from app.ml.model import predict_fair_value_compat as predict_fair_value, train_model_compat as train_model
import logging, os, threading

try:
    import resend
    resend.api_key = os.getenv('RESEND_API_KEY', '')
    RESEND_AVAILABLE = bool(resend.api_key)
except ImportError:
    RESEND_AVAILABLE = False

router = APIRouter()
logger = logging.getLogger(__name__)
RESEND_FROM = os.getenv('RESEND_FROM', 'alertas@nmsdev.tech')

_scraper_running = False

@router.post('/run')
def run_scraper(background_tasks: BackgroundTasks):
    global _scraper_running
    if _scraper_running:
        return {'message': 'Scraper ya en ejecucion', 'running': True}
    background_tasks.add_task(_scrape_thread)
    return {'message': 'Scraping iniciado en background', 'comunas': COMUNAS_TARGET}

@router.get('/status')
def scraper_status():
    db = SessionLocal()
    try:
        total = db.query(Property).count()
        oportunidades = db.query(Valuation).filter(Valuation.opportunity_score >= 70).count()
        diamantes = db.query(Valuation).filter(Valuation.opportunity_score >= 80).count()
        return {
            'running': _scraper_running,
            'total_properties': total,
            'oportunidades': oportunidades,
            'diamantes': diamantes
        }
    finally:
        db.close()

def _scrape_thread():
    global _scraper_running
    _scraper_running = True
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    db = SessionLocal()
    try:
        loop.run_until_complete(_scrape_and_score(db))
    except Exception as e:
        logger.error('Error fatal en scraper: %s', e, exc_info=True)
    finally:
        db.close()
        loop.close()
        _scraper_running = False

def _validate_property(p: dict) -> bool:
    """Validación de sanidad antes de insertar en BD. Retorna False si el dato es inválido."""
    precio_uf = float(p.get('precio_uf') or 0)
    m2 = float(p.get('m2') or 0)
    url = p.get('url', '')

    # Precio mínimo para venta en Santiago
    if precio_uf < 500 or precio_uf > 50000:
        logger.warning('SKIP precio_uf=%.1f fuera de rango: %s', precio_uf, url)
        return False

    # m2 plausibles
    if m2 < 15 or m2 > 2000:
        logger.warning('SKIP m2=%.1f fuera de rango: %s', m2, url)
        return False

    # UF/m² plausible (20–400 para Santiago)
    uf_m2 = precio_uf / m2
    if not (20 <= uf_m2 <= 400):
        logger.warning('SKIP uf/m2=%.2f fuera de rango: %s', uf_m2, url)
        return False

    # URL debe ser absoluta y válida (no fallback inventado)
    if not url.startswith('https://') or len(url) < 20:
        logger.warning('SKIP url invalida: %s', url)
        return False

    return True


async def _scrape_and_score(db):
    logger.info('=== Iniciando scraping: %d comunas ===', len(COMUNAS_TARGET))
    all_props = []
    for comuna in COMUNAS_TARGET:
        try:
            props = await scrape_listings(comuna, max_pages=2)
            all_props.extend(props)
            logger.info('  %s -> %d propiedades', comuna, len(props))
        except Exception as e:
            logger.error('Error en %s: %s', comuna, e)

    logger.info('Total scrapeado: %d', len(all_props))

    # Filtrar antes de entrenar el modelo para no contaminarlo
    props_validas = [p for p in all_props if _validate_property(p)]
    logger.info('Propiedades válidas tras sanity check: %d / %d', len(props_validas), len(all_props))

    if len(props_validas) >= 10:
        train_model(props_validas)

    nuevas, diamantes = 0, []
    for p in props_validas:
        try:
            if db.query(Property).filter(Property.url == p.get('url', '')).first():
                continue
            prop_cols = {c.key for c in Property.__table__.columns}
            prop = Property(**{k: v for k, v in p.items() if k in prop_cols})
            db.add(prop)
            db.flush()
            val = predict_fair_value(p)
            db.add(Valuation(property_id=prop.id, **val))
            nuevas += 1
            if val['opportunity_score'] >= 80:
                diamantes.append({**p, **val})
        except Exception as e:
            logger.error('Error guardando: %s', e)
            db.rollback()

    db.commit()
    logger.info('=== Fin: %d nuevas, %d diamantes ===', nuevas, len(diamantes))
    if diamantes and RESEND_AVAILABLE:
        _send_diamond_alerts(diamantes)

def _send_diamond_alerts(props):
    html = '<h2>Oportunidades Diamante</h2><ul>' + ''.join(
        f"<li><b>{p.get('titulo','')}</b> | {p.get('comuna','')} | Score: {p.get('opportunity_score',0)}</li>"
        for p in props[:5]
    ) + '</ul>'
    try:
        resend.Emails.send({
            'from': RESEND_FROM, 'to': ['javier.jorquera@nmsdev.tech'],
            'subject': f"Clave: {len(props)} Oportunidades Diamante",
            'html': html
        })
    except Exception as e:
        logger.error('Error Resend: %s', e)

@router.post('/purge')
def purge_corrupt_data():
    """
    Elimina de la BD todas las propiedades con datos inválidos:
    - precio_uf < 500 o > 50.000
    - m2 < 15 o > 2000
    - precio_uf/m2 fuera del rango 20–400 UF/m²
    - URLs que no sean absolutas (no empiecen con https://)
    - Valuations con opportunity_score = 100 o diferencia_pct > 5000%

    Retorna conteo de registros eliminados.
    """
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # 1. IDs de propiedades corruptas
        corrupt_ids_query = text("""
            SELECT p.id FROM properties p
            WHERE p.precio_uf < 500
               OR p.precio_uf > 50000
               OR p.m2 IS NULL OR p.m2 < 15 OR p.m2 > 2000
               OR (p.m2 > 0 AND p.precio_uf / p.m2 < 20)
               OR (p.m2 > 0 AND p.precio_uf / p.m2 > 400)
               OR p.url NOT LIKE 'https://%'
               OR length(p.url) < 20
        """)
        corrupt_rows = db.execute(corrupt_ids_query).fetchall()
        corrupt_ids = [r[0] for r in corrupt_rows]

        # 2. Valuations con scores absurdos (independiente de la propiedad)
        corrupt_val_query = text("""
            SELECT id FROM valuations
            WHERE opportunity_score >= 99.9
               OR ABS(diferencia_pct) > 5000
        """)
        corrupt_val_rows = db.execute(corrupt_val_query).fetchall()
        corrupt_val_ids = [r[0] for r in corrupt_val_rows]

        props_eliminadas = 0
        vals_eliminadas = 0

        if corrupt_ids:
            # Eliminar valuations de propiedades corruptas
            db.execute(text(f"DELETE FROM valuations WHERE property_id IN ({','.join(map(str, corrupt_ids))})"))
            db.execute(text(f"DELETE FROM alerts WHERE property_id IN ({','.join(map(str, corrupt_ids))})"))
            db.execute(text(f"DELETE FROM properties WHERE id IN ({','.join(map(str, corrupt_ids))})"))
            props_eliminadas = len(corrupt_ids)

        # Eliminar valuations absurdas de propiedades válidas
        orphan_val_ids = [v for v in corrupt_val_ids if v not in corrupt_ids]
        if orphan_val_ids:
            db.execute(text(f"DELETE FROM valuations WHERE id IN ({','.join(map(str, orphan_val_ids))})"))
            vals_eliminadas = len(orphan_val_ids)

        db.commit()
        logger.info('PURGE: %d propiedades corruptas eliminadas, %d valuations absurdas eliminadas',
                    props_eliminadas, vals_eliminadas)
        return {
            'ok': True,
            'propiedades_eliminadas': props_eliminadas,
            'valuations_absurdas_eliminadas': vals_eliminadas,
            'mensaje': f'Purga completada. {props_eliminadas} propiedades y {vals_eliminadas} valuations corruptas eliminadas.'
        }
    except Exception as e:
        db.rollback()
        logger.error('Error en purge: %s', e, exc_info=True)
        return {'ok': False, 'error': str(e)}
    finally:
        db.close()


@router.post('/seed')
def seed_database(n_per_comuna: int = 60, db=None):
    from fastapi import Depends
    from app.scraper.seed_data import generate_seed_properties, generate_seed_with_bargains
    from app.core.database import SessionLocal
    from app.ml.model import train_model
    db = SessionLocal()
    try:
        props = generate_seed_with_bargains(n_per_comuna)
        train_model(props)
        nuevas, diamantes = 0, []
        for p in props:
            if db.query(Property).filter(Property.url == p['url']).first():
                continue
            prop_cols = {c.key for c in Property.__table__.columns}
            prop = Property(**{k: v for k, v in p.items() if k in prop_cols})
            db.add(prop)
            db.flush()
            val = predict_fair_value(p)
            db.add(Valuation(property_id=prop.id, **val))
            nuevas += 1
            if val['opportunity_score'] >= 80:
                diamantes.append(val['opportunity_score'])
        db.commit()
        logger.info('Seed: %d propiedades, %d diamantes', nuevas, len(diamantes))
        return {
            'ok': True,
            'propiedades_insertadas': nuevas,
            'diamantes': len(diamantes),
            'mensaje': f'{nuevas} propiedades seed insertadas con scoring ML'
        }
    except Exception as e:
        db.rollback()
        logger.error('Error seed: %s', e, exc_info=True)
        return {'ok': False, 'error': str(e)}
    finally:
        db.close()
