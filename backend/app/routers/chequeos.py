from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.sitio import Sitio
from app.models.chequeo import Chequeo
from app.schemas.chequeo_schema import ChequeoRespuesta
from app.services.monitor import verificar_disponibilidad
from app.services.ssl_checker import verificar_ssl
from app.services.alertas import evaluar_y_alertar

router = APIRouter(prefix="/chequeos", tags=["Chequeos"])


def hubo_cambio_de_estado(db: Session, sitio_id: int, disponible_ahora: bool) -> bool:
    """
    Compara el chequeo actual contra el inmediatamente anterior.
    Devuelve True solo si el estado 'disponible' cambió (o si es el primer chequeo).
    Esto evita que el sistema alerte repetidamente mientras un sitio
    permanece en el mismo estado.
    """
    anterior = (
        db.query(Chequeo)
        .filter(Chequeo.sitio_id == sitio_id)
        .order_by(Chequeo.ejecutado_en.desc())
        .offset(1)
        .first()
    )
    if anterior is None:
        return True
    return anterior.disponible != disponible_ahora


@router.post("/ejecutar/{sitio_id}", response_model=ChequeoRespuesta, status_code=status.HTTP_201_CREATED)
def ejecutar_chequeo(sitio_id: int, db: Session = Depends(get_db)):
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")

    resultado_disp = verificar_disponibilidad(sitio.url)
    resultado_ssl = verificar_ssl(sitio.url)
    resultado_completo = {**resultado_disp, **resultado_ssl}

    nuevo_chequeo = Chequeo(
        sitio_id=sitio.id,
        **resultado_completo,
        puntaje_pagespeed=None,
    )

    try:
        db.add(nuevo_chequeo)
        db.commit()
        db.refresh(nuevo_chequeo)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el chequeo: {str(e)}")

    if hubo_cambio_de_estado(db, sitio.id, resultado_completo["disponible"]):
        evaluar_y_alertar(sitio.nombre_cliente, sitio.url, resultado_completo)

    return nuevo_chequeo


@router.post("/ejecutar-todos")
def ejecutar_todos_los_chequeos(db: Session = Depends(get_db)):
    sitios_activos = db.query(Sitio).filter(Sitio.activo == True).all()

    resultados = []
    for sitio in sitios_activos:
        resultado_disp = verificar_disponibilidad(sitio.url)
        resultado_ssl = verificar_ssl(sitio.url)
        resultado_completo = {**resultado_disp, **resultado_ssl}

        nuevo_chequeo = Chequeo(
            sitio_id=sitio.id,
            **resultado_completo,
            puntaje_pagespeed=None,
        )
        db.add(nuevo_chequeo)
        db.commit()
        db.refresh(nuevo_chequeo)

        if hubo_cambio_de_estado(db, sitio.id, resultado_completo["disponible"]):
            evaluar_y_alertar(sitio.nombre_cliente, sitio.url, resultado_completo)

        resultados.append({
            "sitio_id": sitio.id,
            "nombre_cliente": sitio.nombre_cliente,
            "disponible": resultado_completo["disponible"],
        })

    return {
        "total_chequeados": len(resultados),
        "resultados": resultados,
    }


@router.get("/sitio/{sitio_id}", response_model=List[ChequeoRespuesta])
def historial_chequeos(sitio_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Chequeo)
        .filter(Chequeo.sitio_id == sitio_id)
        .order_by(Chequeo.ejecutado_en.desc())
        .all()
    )