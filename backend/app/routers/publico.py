import time
import os

from collections import defaultdict, deque
from threading import BoundedSemaphore, Lock

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.auditoria_publica import UrlNoPermitida, auditar_url

router = APIRouter(prefix="/publico", tags=["Público"])

_VENTANA_SEG = 3600
_MAX_POR_IP = 3
_MAX_GLOBAL_HORA = 40

_candado = Lock()
_por_ip: dict[str, deque] = defaultdict(deque)
_global: deque = deque()
_slots = BoundedSemaphore(2)


class AuditoriaPedido(BaseModel):
    url: str = Field(min_length=3, max_length=300)


def _ip_cliente(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[-1].strip()
    return request.client.host if request.client else "desconocida"


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
            raise HTTPException(status_code=429, detail="Hiciste muchos análisis seguidos. Espera unos minutos e inténtalo otra vez.")
        cola.append(ahora)
        _global.append(ahora)
        if len(_por_ip) > 5000:
            _por_ip.clear()


@router.post("/auditoria")
def auditoria_publica(datos: AuditoriaPedido, request: Request):
    if os.getenv("AUDITORIA_PUBLICA", "off").lower() != "on":
        raise HTTPException(status_code=503, detail="El diagnóstico gratuito no está disponible por el momento.")
    _limitar(_ip_cliente(request))
    if not _slots.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="Hay muchos análisis en curso. Intenta de nuevo en un momento.")
    try:
        return auditar_url(datos.url)
    except UrlNoPermitida as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        _slots.release()