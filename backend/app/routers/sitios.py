from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.sitio import Sitio
from app.schemas.sitio_schema import SitioCrear, SitioRespuesta

router = APIRouter(prefix="/sitios", tags=["Sitios"])


@router.post("/", response_model=SitioRespuesta)
def crear_sitio(sitio: SitioCrear, db: Session = Depends(get_db)):
    existente = db.query(Sitio).filter(Sitio.url == str(sitio.url)).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ese sitio ya está registrado")

    nuevo_sitio = Sitio(nombre_cliente=sitio.nombre_cliente, url=str(sitio.url))
    db.add(nuevo_sitio)
    db.commit()
    db.refresh(nuevo_sitio)
    return nuevo_sitio


@router.get("/", response_model=List[SitioRespuesta])
def listar_sitios(db: Session = Depends(get_db)):
    return db.query(Sitio).all()