from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Chequeo(Base):
    __tablename__ = "chequeos"

    id = Column(Integer, primary_key=True, index=True)
    sitio_id = Column(Integer, ForeignKey("sitios.id"), nullable=False)

    disponible = Column(Boolean, nullable=False)
    tiempo_respuesta_ms = Column(Integer, nullable=True)
    codigo_http = Column(Integer, nullable=True)

    ssl_valido = Column(Boolean, nullable=True)
    ssl_dias_restantes = Column(Integer, nullable=True)

    puntaje_pagespeed = Column(Float, nullable=True)

    ejecutado_en = Column(DateTime(timezone=True), server_default=func.now())

    sitio = relationship("Sitio", backref="chequeos")