from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class SitioCrear(BaseModel):
    nombre_cliente: str = Field(min_length=2, max_length=120)
    url: HttpUrl
    oculto: bool = False


class SitioActualizar(BaseModel):
    nombre_cliente: Optional[str] = Field(default=None, min_length=2, max_length=120)
    url: Optional[HttpUrl] = None
    activo: Optional[bool] = None
    oculto: Optional[bool] = None


class SitioRespuesta(BaseModel):
    id: int
    nombre_cliente: str
    url: str
    activo: bool
    oculto: bool
    creado_en: datetime

    class Config:
        from_attributes = True