from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.sitio import Sitio
from app.models.chequeo import Chequeo
from app.schemas.chequeo_schema import ChequeoRespuesta
from app.services.monitor import verificar_disponibilidad
from app.services.ssl_checker import verificar_ssl
from app.services.alertas import evaluar_y_alertar, enviar_resumen
from app.auth import requerir_usuario, requerir_usuario_o_cron
from collections import defaultdict
from datetime import datetime, timedelta, timezone

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
        return not disponible_ahora
    return anterior.disponible != disponible_ahora


def ssl_cambio_de_dias(db: Session, sitio_id: int, dias_ahora) -> bool:
    anterior = (
        db.query(Chequeo)
        .filter(Chequeo.sitio_id == sitio_id)
        .order_by(Chequeo.ejecutado_en.desc())
        .offset(1)
        .first()
    )
    if anterior is None:
        return True
    return anterior.ssl_dias_restantes != dias_ahora


@router.post("/ejecutar/{sitio_id}", response_model=ChequeoRespuesta, status_code=status.HTTP_201_CREATED, dependencies=[Depends(requerir_usuario)])
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


@router.post("/ejecutar-todos", dependencies=[Depends(requerir_usuario_o_cron)])
def ejecutar_todos_los_chequeos(db: Session = Depends(get_db)):
    sitios_activos = db.query(Sitio).filter(Sitio.activo == True).all()

    resultados = []
    resumen = []
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

        resumen.append({
            "nombre": sitio.nombre_cliente,
            "disponible": resultado_completo["disponible"],
            "codigo": resultado_completo.get("codigo_http"),
            "ssl_dias": resultado_completo.get("ssl_dias_restantes"),
            "ssl_cambio": ssl_cambio_de_dias(db, sitio.id, resultado_completo.get("ssl_dias_restantes")),
            "cambio": hubo_cambio_de_estado(db, sitio.id, resultado_completo["disponible"]),
        })

        resultados.append({
            "sitio_id": sitio.id,
            "nombre_cliente": sitio.nombre_cliente,
            "disponible": resultado_completo["disponible"],
        })

    enviar_resumen(resumen)

    return {
        "total_chequeados": len(resultados),
        "resultados": resultados,
    }


@router.get("/sitio/{sitio_id}", response_model=List[ChequeoRespuesta], dependencies=[Depends(requerir_usuario)])
def historial_chequeos(sitio_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Chequeo)
        .filter(Chequeo.sitio_id == sitio_id)
        .order_by(Chequeo.ejecutado_en.desc())
        .all()
    )



ZONA_PERU = timezone(timedelta(hours=-5))


@router.get("/uptime", dependencies=[Depends(requerir_usuario)])
def resumen_uptime(db: Session = Depends(get_db)):
    """
    Uptime de los últimos 7 y 30 días por sitio, más el estado de cada
    uno de los últimos 30 días (hora de Lima) para la barra de disponibilidad.
    """
    hoy = datetime.now(ZONA_PERU).date()
    inicio = datetime.combine(hoy - timedelta(days=29), datetime.min.time(), tzinfo=ZONA_PERU)
    limite_7 = hoy - timedelta(days=6)
    lista_dias = [hoy - timedelta(days=i) for i in range(29, -1, -1)]

    filas = (
        db.query(Chequeo.sitio_id, Chequeo.disponible, Chequeo.ejecutado_en)
        .filter(Chequeo.ejecutado_en >= inicio)
        .all()
    )

    # sitio_id -> fecha -> [total, disponibles]
    acumulado = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for sitio_id, disponible, ejecutado_en in filas:
        if ejecutado_en.tzinfo is None:
            ejecutado_en = ejecutado_en.replace(tzinfo=timezone.utc)
        fecha = ejecutado_en.astimezone(ZONA_PERU).date()
        celda = acumulado[sitio_id][fecha]
        celda[0] += 1
        if disponible:
            celda[1] += 1

    resultado = []
    for sitio_id, por_dia in acumulado.items():
        total_30 = sum(v[0] for v in por_dia.values())
        ok_30 = sum(v[1] for v in por_dia.values())
        total_7 = sum(v[0] for f, v in por_dia.items() if f >= limite_7)
        ok_7 = sum(v[1] for f, v in por_dia.items() if f >= limite_7)

        dias = []
        for f in lista_dias:
            total, ok = por_dia.get(f, (0, 0))
            if total == 0:
                estado = "sin_datos"
            elif ok == total:
                estado = "ok"
            elif ok == 0:
                estado = "caido"
            else:
                estado = "parcial"
            dias.append({"fecha": f.isoformat(), "estado": estado, "chequeos": total, "ok": ok})

        resultado.append({
            "sitio_id": sitio_id,
            "uptime_7d": round(ok_7 * 100 / total_7, 2) if total_7 else None,
            "uptime_30d": round(ok_30 * 100 / total_30, 2) if total_30 else None,
            "chequeos_7d": total_7,
            "chequeos_30d": total_30,
            "dias": dias,
        })

    return resultado