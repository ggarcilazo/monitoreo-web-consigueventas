import html
import os
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import requerir_admin
from app.config import settings
from app.database import get_db
from app.services import ajustes as servicio
from app.services.actividad import registrar
from app.services.telegram_bot import enviar_alerta

router = APIRouter(prefix="/ajustes", tags=["Ajustes"], dependencies=[Depends(requerir_admin)])

VERSION = "1.0"
_ultima_prueba = {"t": 0.0}


class AjustesRespuesta(BaseModel):
    diagnostico_publico: bool
    origen_diagnostico: str
    umbral_ssl_dias: int
    telegram_configurado: bool
    turnstile_configurado: bool
    version: str


class AjustesActualizar(BaseModel):
    diagnostico_publico: Optional[bool] = None
    umbral_ssl_dias: Optional[int] = Field(default=None, ge=1, le=60)


def _estado(db: Session) -> AjustesRespuesta:
    activo, origen = servicio.diagnostico_activo(db)
    return AjustesRespuesta(
        diagnostico_publico=activo,
        origen_diagnostico=origen,
        umbral_ssl_dias=servicio.umbral_ssl_dias(db),
        telegram_configurado=bool(settings.telegram_bot_token and settings.telegram_chat_id),
        turnstile_configurado=bool(os.getenv("TURNSTILE_SECRET")),
        version=VERSION,
    )


@router.get("/", response_model=AjustesRespuesta)
def ver_ajustes(db: Session = Depends(get_db)):
    servicio.invalidar()
    return _estado(db)


@router.patch("/", response_model=AjustesRespuesta)
def actualizar_ajustes(
    datos: AjustesActualizar,
    usuario: dict = Depends(requerir_admin),
    db: Session = Depends(get_db),
):
    cambios = datos.model_dump(exclude_unset=True)
    piezas = []
    try:
        if cambios.get("diagnostico_publico") is not None:
            nuevo = "on" if cambios["diagnostico_publico"] else "off"
            servicio.guardar(db, "diagnostico_publico", nuevo, usuario.get("email"))
            piezas.append("encendió el diagnóstico público" if nuevo == "on" else "apagó el diagnóstico público")
        if cambios.get("umbral_ssl_dias") is not None:
            servicio.guardar(db, "umbral_ssl_dias", cambios["umbral_ssl_dias"], usuario.get("email"))
            piezas.append(f"fijó el aviso de SSL en {cambios['umbral_ssl_dias']} días")
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudieron guardar los ajustes.")

    servicio.invalidar()
    if piezas:
        registrar(db, usuario, "ajustes_modificados", "ajustes", None, "Ajustes: " + ", ".join(piezas) + ".")
    return _estado(db)


@router.post("/telegram-prueba")
def probar_telegram(usuario: dict = Depends(requerir_admin), db: Session = Depends(get_db)):
    ahora = time.time()
    if ahora - _ultima_prueba["t"] < 10:
        raise HTTPException(status_code=429, detail="Espera unos segundos antes de enviar otra prueba.")
    _ultima_prueba["t"] = ahora

    mensaje = (
        "🧪 <b>Mensaje de prueba</b>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        f"Enviado desde el panel por {html.escape(usuario.get('email') or 'un administrador')}.\n"
        "Si ves este mensaje, las alertas están llegando bien. ✅"
    )
    try:
        enviado = bool(enviar_alerta(mensaje))
    except Exception:
        enviado = False

    registrar(db, usuario, "telegram_prueba", "ajustes", None,
              f"Envió un mensaje de prueba a Telegram ({'entregado' if enviado else 'falló'}).")
    return {"enviado": enviado}