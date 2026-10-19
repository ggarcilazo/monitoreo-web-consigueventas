from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.database import Base


class Actividad(Base):
    __tablename__ = "actividad"

    id = Column(Integer, primary_key=True, index=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    usuario_email = Column(String(160), nullable=True)
    usuario_id = Column(String(64), nullable=True)
    accion = Column(String(40), nullable=False)
    entidad = Column(String(30), nullable=False, index=True)
    entidad_id = Column(String(64), nullable=True)
    descripcion = Column(String(300), nullable=False, default="")
    detalle = Column(JSONB, nullable=True)