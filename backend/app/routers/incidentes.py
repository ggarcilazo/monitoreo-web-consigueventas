from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import requerir_usuario
from app.database import get_db
from app.models.chequeo import Chequeo
from app.models.sitio import Sitio

router = APIRouter(prefix="/incidentes", tags=["Incidentes"], dependencies=[Depends(requerir_usuario)])


class IncidenteRespuesta(BaseModel):
    sitio_id: int
    nombre_cliente: str
    url: str
    inicio: datetime
    fin: Optional[datetime] = None
    duracion_seg: int
    abierto: bool
    chequeos_fallidos: int
    codigo_http: Optional[int] = None


@router.get("/", response_model=List[IncidenteRespuesta])
def listar_incidentes(dias: int = Query(30, ge=1, le=180), db: Session = Depends(get_db)):
    """Caídas de los últimos N días: rachas de chequeos fallidos seguidos por sitio."""
    ahora = datetime.now(timezone.utc)
    desde = ahora - timedelta(days=dias)

    filas = (
        db.query(
            Chequeo.sitio_id,
            Chequeo.disponible,
            Chequeo.codigo_http,
            Chequeo.ejecutado_en,
            Sitio.nombre_cliente,
            Sitio.url,
        )
        .join(Sitio, Sitio.id == Chequeo.sitio_id)
        .filter(Chequeo.ejecutado_en >= desde)
        .order_by(Chequeo.sitio_id, Chequeo.ejecutado_en)
        .all()
    )

    incidentes = []
    actual = None
    sitio_previo = None

    for sitio_id, disponible, codigo, momento, nombre, url in filas:
        if momento.tzinfo is None:
            momento = momento.replace(tzinfo=timezone.utc)

        if sitio_id != sitio_previo:
            if actual is not None:
                incidentes.append(actual)
            actual = None
            sitio_previo = sitio_id

        if not disponible:
            if actual is None:
                actual = {
                    "sitio_id": sitio_id,
                    "nombre_cliente": nombre,
                    "url": url,
                    "inicio": momento,
                    "fin": None,
                    "chequeos_fallidos": 1,
                    "codigo_http": codigo,
                }
            else:
                actual["chequeos_fallidos"] += 1
        elif actual is not None:
            actual["fin"] = momento
            incidentes.append(actual)
            actual = None

    if actual is not None:
        incidentes.append(actual)

    for i in incidentes:
        i["abierto"] = i["fin"] is None
        i["duracion_seg"] = int(((i["fin"] or ahora) - i["inicio"]).total_seconds())

    incidentes.sort(key=lambda i: i["inicio"], reverse=True)
    return incidentes