from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import requerir_admin
from app.database import get_db
from app.models.actividad import Actividad

router = APIRouter(prefix="/actividad", tags=["Actividad"], dependencies=[Depends(requerir_admin)])


class ActividadRespuesta(BaseModel):
    id: int
    creado_en: datetime
    usuario_email: Optional[str] = None
    accion: str
    entidad: str
    entidad_id: Optional[str] = None
    descripcion: str
    detalle: Optional[Any] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ActividadRespuesta])
def listar_actividad(
    dias: int = Query(30, ge=1, le=365),
    entidad: Optional[str] = Query(None, max_length=30),
    limite: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    desde = datetime.now(timezone.utc) - timedelta(days=dias)
    consulta = db.query(Actividad).filter(Actividad.creado_en >= desde)
    if entidad:
        consulta = consulta.filter(Actividad.entidad == entidad)
    return consulta.order_by(Actividad.creado_en.desc()).limit(limite).all()