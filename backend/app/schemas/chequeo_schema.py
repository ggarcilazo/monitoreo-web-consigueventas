from datetime import datetime
from pydantic import BaseModel


class ChequeoRespuesta(BaseModel):
    id: int
    sitio_id: int
    disponible: bool
    tiempo_respuesta_ms: int | None
    codigo_http: int | None
    ssl_valido: bool | None
    ssl_dias_restantes: int | None
    puntaje_pagespeed: float | None
    ejecutado_en: datetime

    class Config:
        from_attributes = True