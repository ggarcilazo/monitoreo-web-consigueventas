from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

from app.database import Base


class Ajuste(Base):
    __tablename__ = "ajustes"

    clave = Column(String(50), primary_key=True)
    valor = Column(String(200), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    actualizado_por = Column(String(160), nullable=True)