from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Property(Base):
    __tablename__ = "properties"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), unique=True, index=True)
    titulo = Column(String(300))
    precio_uf = Column(Float)
    m2 = Column(Float)
    m2_terreno = Column(Float, nullable=True)
    comuna = Column(String(100), index=True)
    region = Column(String(100), default="Metropolitana")
    tipo = Column(String(50))  # departamento, casa
    habitaciones = Column(Integer, nullable=True)
    banos = Column(Integer, nullable=True)
    antiguedad = Column(Integer, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    fuente = Column(String(50))  # portalinmobiliario, toctoc
    fecha_scraping = Column(DateTime, default=datetime.utcnow)
    activo = Column(Boolean, default=True)
    valuations = relationship("Valuation", back_populates="property")

class Valuation(Base):
    __tablename__ = "valuations"
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    valor_justo_uf = Column(Float)
    opportunity_score = Column(Float)  # 0-100
    precio_lista_uf = Column(Float)
    diferencia_pct = Column(Float)
    fecha_calculo = Column(DateTime, default=datetime.utcnow)
    property = relationship("Property", back_populates="valuations")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(200))
    property_id = Column(Integer, ForeignKey("properties.id"))
    opportunity_score = Column(Float)
    enviada_at = Column(DateTime, default=datetime.utcnow)
    enviada = Column(Boolean, default=False)
