from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.sitio import Sitio
from app.models.chequeo import Chequeo
from app.schemas.sitio_schema import SitioCrear, SitioRespuesta

router = APIRouter(prefix="/sitios", tags=["Sitios"])


@router.post("/", response_model=SitioRespuesta)
def crear_sitio(sitio: SitioCrear, db: Session = Depends(get_db)):
    existente = db.query(Sitio).filter(Sitio.url == str(sitio.url)).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ese sitio ya está registrado")

    nuevo_sitio = Sitio(
        nombre_cliente=sitio.nombre_cliente,
        url=str(sitio.url),
        oculto=sitio.oculto,
    )
    db.add(nuevo_sitio)
    db.commit()
    db.refresh(nuevo_sitio)
    return nuevo_sitio


@router.get("/", response_model=List[SitioRespuesta])
def listar_sitios(db: Session = Depends(get_db)):
    return db.query(Sitio).all()


@router.delete("/{sitio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_sitio(sitio_id: int, db: Session = Depends(get_db)):
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")
    db.query(Chequeo).filter(Chequeo.sitio_id == sitio_id).delete()
    db.delete(sitio)
    db.commit()