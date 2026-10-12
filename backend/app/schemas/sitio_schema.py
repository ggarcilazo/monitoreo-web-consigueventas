from datetime import datetime
from pydantic import BaseModel, HttpUrl


class SitioCrear(BaseModel):
    nombre_cliente: str
    url: HttpUrl


class SitioRespuesta(BaseModel):
    id: int
    nombre_cliente: str
    url: str
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = True


class SitioCrear(BaseModel):
    nombre_cliente: str
    url: HttpUrl
    oculto: bool = False

class SitioRespuesta(BaseModel):
    id: int
    nombre_cliente: str
    url: str
    activo: bool
    oculto: bool
    creado_en: datetime
    class Config:
        from_attributes = True