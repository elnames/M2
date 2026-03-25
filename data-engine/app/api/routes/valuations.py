from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.models import Valuation, Property
router = APIRouter()

@router.get("/top-oportunidades")
def get_top_oportunidades(limit: int = 10, db: Session = Depends(get_db)):
    results = db.query(Property, Valuation)        .join(Valuation)        .filter(Valuation.opportunity_score >= 70)        .order_by(Valuation.opportunity_score.desc())        .limit(limit).all()
    return [{
        "id": p.id, "titulo": p.titulo, "comuna": p.comuna,
        "precio_uf": p.precio_uf, "valor_justo_uf": v.valor_justo_uf,
        "opportunity_score": v.opportunity_score, "url": p.url,
        "lat": p.lat, "lng": p.lng
    } for p, v in results]
