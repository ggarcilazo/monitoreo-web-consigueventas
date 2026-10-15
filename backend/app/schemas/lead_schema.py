from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

EstadoLead = Literal["nuevo", "contactado", "en_proceso", "ganado", "descartado"]


class LeadCrear(BaseModel):
    auditoria_id: str = Field(min_length=10, max_length=80)
    nombre: str = Field(min_length=2, max_length=120)
    correo: str = Field(max_length=160, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    telefono: Optional[str] = Field(default=None, pattern=r"^[0-9+()\-\s]{6,30}$")
    consentimiento: bool
    website: str = Field(default="", max_length=200)  # campo trampa para bots


class LeadRespuesta(BaseModel):
    id: int
    nombre: str
    correo: str
    telefono: Optional[str] = None
    url_analizada: str
    puntaje_global: Optional[int] = None
    estado: str
    notas: Optional[str] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadDetalle(LeadRespuesta):
    informe: Optional[Any] = None


class LeadActualizar(BaseModel):
    estado: Optional[EstadoLead] = None
    notas: Optional[str] = Field(default=None, max_length=2000)