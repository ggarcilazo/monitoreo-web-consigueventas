from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import requerir_admin
from app.database import get_db
from app.models.chequeo import Chequeo
from app.models.sitio import Sitio
from app.schemas.sitio_schema import SitioActualizar, SitioCrear, SitioRespuesta
from app.services.actividad import registrar

router = APIRouter(prefix="/sitios", tags=["Sitios"])


@router.get("/", response_model=List[SitioRespuesta])
def listar_sitios(db: Session = Depends(get_db)):
    return db.query(Sitio).order_by(Sitio.nombre_cliente).all()


@router.post("/", response_model=SitioRespuesta, status_code=status.HTTP_201_CREATED)
def crear_sitio(sitio: SitioCrear, usuario: dict = Depends(requerir_admin), db: Session = Depends(get_db)):
    url = str(sitio.url)
    if db.query(Sitio).filter(Sitio.url == url).first():
        raise HTTPException(status_code=400, detail="Ese sitio ya está registrado")

    nuevo = Sitio(nombre_cliente=sitio.nombre_cliente.strip(), url=url, oculto=sitio.oculto)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    registrar(db, usuario, "sitio_creado", "sitio", nuevo.id,
              f"Agregó el sitio «{nuevo.nombre_cliente}» ({nuevo.url}).")
    db.refresh(nuevo)
    return nuevo


@router.patch("/{sitio_id}", response_model=SitioRespuesta)
def actualizar_sitio(
    sitio_id: int,
    datos: SitioActualizar,
    usuario: dict = Depends(requerir_admin),
    db: Session = Depends(get_db),
):
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")

    cambios = datos.model_dump(exclude_unset=True)
    nombre_original = sitio.nombre_cliente
    piezas = []

    if cambios.get("url") is not None:
        nueva = str(cambios["url"])
        repetido = db.query(Sitio).filter(Sitio.url == nueva, Sitio.id != sitio_id).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro sitio con esa dirección")
        if nueva != sitio.url:
            piezas.append("cambió la dirección")
        sitio.url = nueva
    if cambios.get("nombre_cliente") is not None:
        nuevo_nombre = cambios["nombre_cliente"].strip()
        if nuevo_nombre != sitio.nombre_cliente:
            piezas.append(f"cambió el nombre a «{nuevo_nombre}»")
        sitio.nombre_cliente = nuevo_nombre
    if cambios.get("activo") is not None:
        if cambios["activo"] != sitio.activo:
            piezas.append("reanudó el monitoreo" if cambios["activo"] else "pausó el monitoreo")
        sitio.activo = cambios["activo"]
    if cambios.get("oculto") is not None:
        if cambios["oculto"] != sitio.oculto:
            piezas.append("lo ocultó del panel" if cambios["oculto"] else "lo volvió a mostrar en el panel")
        sitio.oculto = cambios["oculto"]

    db.commit()
    db.refresh(sitio)

    if piezas:
        registrar(db, usuario, "sitio_modificado", "sitio", sitio.id,
                  f"Sitio «{nombre_original}»: " + ", ".join(piezas) + ".",
                  {"campos": list(cambios.keys())})
        db.refresh(sitio)
    return sitio


@router.delete("/{sitio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_sitio(sitio_id: int, usuario: dict = Depends(requerir_admin), db: Session = Depends(get_db)):
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")

    nombre, url = sitio.nombre_cliente, sitio.url
    db.query(Chequeo).filter(Chequeo.sitio_id == sitio_id).delete()
    db.delete(sitio)
    db.commit()

    registrar(db, usuario, "sitio_eliminado", "sitio", sitio_id,
              f"Eliminó el sitio «{nombre}» ({url}) y su historial de chequeos.")