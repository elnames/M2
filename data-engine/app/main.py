import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.routes import properties, valuations, scraper, health

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)

app = FastAPI(title='Clave Inmobiliaria - Data Engine', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://web:3000', 'https://m2.nmsdev.tech', 'https://clave.nmsdev.tech'],
    allow_methods=['GET', 'POST'],
    allow_headers=['*'],
)

app.include_router(health.router, prefix='/health', tags=['health'])
app.include_router(properties.router, prefix='/api/properties', tags=['properties'])
app.include_router(valuations.router, prefix='/api/valuations', tags=['valuations'])
app.include_router(scraper.router, prefix='/api/scraper', tags=['scraper'])

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

_scheduler = BackgroundScheduler(timezone='America/Santiago')

def _daily_scrape():
    import requests
    try:
        requests.post('http://localhost:3050/api/scraper/run', timeout=5)
        logging.info('Auto-scrape diario iniciado por scheduler')
    except Exception as e:
        logging.error('Error iniciando auto-scrape: %s', e)

@app.on_event('startup')
async def startup():
    Base.metadata.create_all(bind=engine)
    logging.info('Database tables verified OK')
    # Scraping automatico diario a las 04:00 AM hora Chile
    _scheduler.add_job(_daily_scrape, CronTrigger(hour=4, minute=0))
    _scheduler.start()
    logging.info('Scheduler iniciado: scraping automatico diario 04:00 AM')

@app.on_event('shutdown')
async def shutdown():
    _scheduler.shutdown()
