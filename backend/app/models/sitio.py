from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.database import Base


class Sitio(Base):
    __tablename__ = "sitios"

    id = Column(Integer, primary_key=True, index=True)
    nombre_cliente = Column(String(150), nullable=False)
    url = Column(String(255), nullable=False, unique=True)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())