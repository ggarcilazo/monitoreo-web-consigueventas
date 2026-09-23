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


@router.post("/ejecutar/{sitio_id}", response_model=ChequeoRespuesta, status_code=status.HTTP_201_CREATED)
def ejecutar_chequeo(sitio_id: int, db: Session = Depends(get_db)):
    # 1. Verificar si el sitio existe
    sitio = db.query(Sitio).filter(Sitio.id == sitio_id).first()
    if not sitio:
        raise HTTPException(status_code=404, detail="Sitio no encontrado")

    # 2. Ejecutar los análisis externos
    resultado_disp = verificar_disponibilidad(sitio.url)
    resultado_ssl = verificar_ssl(sitio.url)

    # 3. Combinar resultados y procesar alertas de Telegram
    resultado_completo = {**resultado_disp, **resultado_ssl}
    evaluar_y_alertar(sitio.nombre_cliente, sitio.url, resultado_completo)

    # 4. Guardar el historial en la base de datos
    nuevo_chequeo = Chequeo(
        sitio_id=sitio.id,
        **resultado_completo,  # 💡 Corregido: Desempaqueta el diccionario ya unificado
        puntaje_pagespeed=None,
    )
    
    try:
        db.add(nuevo_chequeo)
        db.commit()
        db.refresh(nuevo_chequeo)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el chequeo: {str(e)}")
    
    return nuevo_chequeo


@router.get("/sitio/{sitio_id}", response_model=List[ChequeoRespuesta])
def historial_chequeos(sitio_id: int, db: Session = Depends(get_db)):
    # Opcional: Podrías validar aquí también si el sitio existe antes de traer la lista vacía
    return (
        db.query(Chequeo)
        .filter(Chequeo.sitio_id == sitio_id)
        .order_by(Chequeo.ejecutado_en.desc())
        .all()
    )
