from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.models import Property, Valuation
from typing import Optional

router = APIRouter()

@router.get("/")
def get_properties(
    comuna: Optional[str] = None,
    min_score: Optional[float] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(Property, Valuation)        .join(Valuation, Property.id == Valuation.property_id)        .filter(Property.activo == True)
    if comuna:
        q = q.filter(Property.comuna.ilike(f"%{comuna}%"))
    if min_score:
        q = q.filter(Valuation.opportunity_score >= min_score)
    results = q.order_by(Valuation.opportunity_score.desc()).offset(offset).limit(limit).all()
    return [{
        "id": p.id, "titulo": p.titulo, "precio_uf": p.precio_uf,
        "m2": p.m2, "comuna": p.comuna, "lat": p.lat, "lng": p.lng,
        "tipo": p.tipo, "fuente": p.fuente,
        "opportunity_score": v.opportunity_score, "valor_justo_uf": v.valor_justo_uf,
        "diferencia_pct": v.diferencia_pct, "url": p.url
    } for p, v in results]

@router.get("/heatmap")
def get_heatmap(db: Session = Depends(get_db)):
    results = (
        db.query(Property.lat, Property.lng, Property.comuna, Valuation.opportunity_score)
        .join(Valuation)
        .filter(Property.lat.isnot(None), Property.lng.isnot(None))
        .all()
    )
    return [{"lat": lat, "lng": lng, "comuna": comuna, "intensity": score} for lat, lng, comuna, score in results]
