from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import requerir_admin
from app.database import get_db
from app.models.chequeo import Chequeo
from app.models.sitio import Sitio
from app.schemas.sitio_schema import SitioActualizar, SitioCrear, SitioRespuesta

router = APIRouter(prefix="/sitios", tags=["Sitios"])


@router.get("/", response_model=List[SitioRespuesta])
def listar_sitios(db: Session = Depends(get_db)):
    return db.query(Sitio).order_by(Sitio.nombre_cliente).all()


@router.post("/", response_model=SitioRespuesta, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(requerir_admin)])
def crear_sitio(sitio: SitioCrear, db: Session = Depends(get_db)):
    url = str(sitio.url)
    if db.query(Sitio).filter(Sitio.url == url).first():
        raise HTTPException(status_code=400, detail="Ese sitio ya está registrado")

    nuevo = Sitio(nombre_cliente=sitio.nombre_cliente.strip(), url=url, oculto=sitio.oculto)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.patch("/{sitio_id}", response_model=SitioRespuesta, dependencies=[Depends(requerir_admin)])
def actualizar_sitio(sitio_id: int, datos: SitioActualizar, db: Session = Depends(get_db)):
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")

    cambios = datos.model_dump(exclude_unset=True)

    if cambios.get("url") is not None:
        nueva = str(cambios["url"])
        repetido = db.query(Sitio).filter(Sitio.url == nueva, Sitio.id != sitio_id).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro sitio con esa dirección")
        sitio.url = nueva
    if cambios.get("nombre_cliente") is not None:
        sitio.nombre_cliente = cambios["nombre_cliente"].strip()
    if cambios.get("activo") is not None:
        sitio.activo = cambios["activo"]
    if cambios.get("oculto") is not None:
        sitio.oculto = cambios["oculto"]

    db.commit()
    db.refresh(sitio)
    return sitio


@router.delete("/{sitio_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(requerir_admin)])
def eliminar_sitio(sitio_id: int, db: Session = Depends(get_db)):
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")
    db.query(Chequeo).filter(Chequeo.sitio_id == sitio_id).delete()
    db.delete(sitio)
    db.commit()