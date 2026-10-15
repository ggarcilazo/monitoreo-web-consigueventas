import html
import os
import secrets
import time
import httpx

from collections import defaultdict, deque
from threading import BoundedSemaphore, Lock

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead_schema import LeadCrear
from app.services.auditoria_publica import UrlNoPermitida, auditar_url
from app.services.telegram_bot import enviar_alerta

router = APIRouter(prefix="/publico", tags=["Público"])

_VENTANA_SEG = 3600
_MAX_POR_IP = 3
_MAX_GLOBAL_HORA = 40
_MAX_LEADS_POR_IP = 5
_CACHE_SEG = 3600
_CACHE_MAX = 500

_candado = Lock()
_por_ip: dict[str, deque] = defaultdict(deque)
_leads_por_ip: dict[str, deque] = defaultdict(deque)
_global: deque = deque()
_slots = BoundedSemaphore(2)
_informes: dict[str, tuple[float, dict]] = {}


class AuditoriaPedido(BaseModel):
    url: str = Field(min_length=3, max_length=300)
    turnstile: str = Field(default="", max_length=2048)


def _verificar_activo() -> None:
    if os.getenv("AUDITORIA_PUBLICA", "off").lower() != "on":
        raise HTTPException(status_code=503, detail="El diagnóstico gratuito no está disponible por el momento.")


def _ip_cliente(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[-1].strip()
    return request.client.host if request.client else "desconocida"

def _verificar_turnstile(token: str) -> None:
    secreto = os.getenv("TURNSTILE_SECRET", "")
    if not secreto:
        raise HTTPException(status_code=503, detail="La verificación de seguridad no está configurada.")
    if not token:
        raise HTTPException(status_code=400, detail="Completa la verificación de seguridad antes de analizar.")
    try:
        r = httpx.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": secreto, "response": token},
            timeout=8,
        )
        ok = r.status_code == 200 and r.json().get("success") is True
    except Exception:
        raise HTTPException(status_code=503, detail="No se pudo verificar la seguridad. Inténtalo de nuevo.")
    if not ok:
        raise HTTPException(status_code=400, detail="No pasaste la verificación de seguridad. Recarga la página e inténtalo de nuevo.")



def _limitar(ip: str) -> None:
    ahora = time.time()
    with _candado:
        while _global and _global[0] < ahora - 3600:
            _global.popleft()
        cola = _por_ip[ip]
        while cola and cola[0] < ahora - _VENTANA_SEG:
            cola.popleft()
        if len(_global) >= _MAX_GLOBAL_HORA:
            raise HTTPException(status_code=429, detail="El servicio está muy solicitado. Intenta de nuevo más tarde.")
        if len(cola) >= _MAX_POR_IP:
            raise HTTPException(status_code=429, detail="Hiciste muchos análisis seguidos. Espera un rato e inténtalo otra vez.")
        cola.append(ahora)
        _global.append(ahora)
        if len(_por_ip) > 5000:
            _por_ip.clear()


def _limitar_leads(ip: str) -> None:
    ahora = time.time()
    with _candado:
        cola = _leads_por_ip[ip]
        while cola and cola[0] < ahora - 3600:
            cola.popleft()
        if len(cola) >= _MAX_LEADS_POR_IP:
            raise HTTPException(status_code=429, detail="Ya enviaste varias solicitudes. Intenta más tarde.")
        cola.append(ahora)
        if len(_leads_por_ip) > 5000:
            _leads_por_ip.clear()


def _guardar_informe(informe: dict) -> str:
    ahora = time.time()
    with _candado:
        for k in [k for k, (t, _) in _informes.items() if t < ahora - _CACHE_SEG]:
            del _informes[k]
        if len(_informes) >= _CACHE_MAX:
            del _informes[min(_informes, key=lambda k: _informes[k][0])]
        auditoria_id = secrets.token_urlsafe(16)
        _informes[auditoria_id] = (ahora, informe)
    return auditoria_id


def _vista_previa(informe: dict, auditoria_id: str) -> dict:
    categorias = informe["categorias"]
    return {
        "auditoria_id": auditoria_id,
        "url": informe["url"],
        "url_final": informe["url_final"],
        "analizado_en": informe["analizado_en"],
        "puntaje_global": informe["puntaje_global"],
        "problemas": sum(1 for c in categorias for h in c["hallazgos"] if not h["ok"]),
        "categorias": [
            {k: c[k] for k in ("id", "titulo", "puntaje", "estado", "resumen")} for c in categorias
        ],
    }


def _avisar_lead(lead: Lead) -> None:
    try:
        e = html.escape
        enviar_alerta(
            "🆕 <b>NUEVO LEAD</b>\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"👤 <b>Nombre:</b> {e(lead.nombre)}\n"
            f"📧 <b>Correo:</b> {e(lead.correo)}\n"
            f"📱 <b>Teléfono:</b> {e(lead.telefono or 'No indicó')}\n"
            f"🌐 <b>Sitio:</b> {e(lead.url_analizada)}\n"
            f"📊 <b>Puntaje:</b> {lead.puntaje_global}/100"
        )
    except Exception:
        pass


@router.post("/auditoria")
def auditoria_publica(datos: AuditoriaPedido, request: Request):
    _verificar_activo()
    _verificar_turnstile(datos.turnstile)
    _limitar(_ip_cliente(request))
    if not _slots.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="Hay muchos análisis en curso. Intenta de nuevo en un momento.")
    try:
        informe = auditar_url(datos.url)
    except UrlNoPermitida as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        _slots.release()
    return _vista_previa(informe, _guardar_informe(informe))


@router.post("/leads")
def registrar_lead(datos: LeadCrear, request: Request, db: Session = Depends(get_db)):
    _verificar_activo()
    if datos.website.strip():
        return {"ok": True}
    _limitar_leads(_ip_cliente(request))
    if not datos.consentimiento:
        raise HTTPException(status_code=400, detail="Debes aceptar el tratamiento de tus datos para recibir el informe.")

    with _candado:
        entrada = _informes.get(datos.auditoria_id)
    if not entrada or entrada[0] < time.time() - _CACHE_SEG:
        raise HTTPException(status_code=404, detail="El análisis expiró. Vuelve a analizar tu sitio.")
    informe = entrada[1]

    lead = Lead(
        nombre=datos.nombre.strip(),
        correo=datos.correo.strip().lower(),
        telefono=(datos.telefono or "").strip() or None,
        url_analizada=informe["url"][:300],
        puntaje_global=informe["puntaje_global"],
        informe=informe,
        consentimiento=True,
    )
    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar tu solicitud. Inténtalo de nuevo.")

    _avisar_lead(lead)
    return {"ok": True, "informe": informe}