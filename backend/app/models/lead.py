from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    correo = Column(String(160), nullable=False, index=True)
    telefono = Column(String(30), nullable=True)
    url_analizada = Column(String(300), nullable=False)
    puntaje_global = Column(Integer, nullable=True)
    consentimiento = Column(Boolean, nullable=False, default=False)
    estado = Column(String(20), nullable=False, default="nuevo")
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)