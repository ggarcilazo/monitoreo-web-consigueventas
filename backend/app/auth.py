import os
import secrets
import time

import httpx
from fastapi import Header, HTTPException

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
CRON_SECRET = os.getenv("CRON_SECRET", "")

ROLES_VALIDOS = {"admin", "lector"}

_CACHE_SEGUNDOS = 60
_cache: dict[str, tuple[dict, float]] = {}


def _usuario_del_token(token: str) -> dict:
    ahora = time.time()
    en_cache = _cache.get(token)
    if en_cache and en_cache[1] > ahora:
        return en_cache[0]

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Autenticación no configurada en el servidor")

    try:
        r = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"},
            timeout=10,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="No se pudo verificar la sesión")

    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")

    datos = r.json()
    usuario = {
        "email": (datos.get("email") or "").lower(),
        "rol": ((datos.get("app_metadata") or {}).get("rol") or "").lower(),
        "id": datos.get("id") or "",
    }
    if len(_cache) > 200:
        _cache.clear()
    _cache[token] = (usuario, ahora + _CACHE_SEGUNDOS)
    return usuario


def _usuario_desde_header(authorization) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    usuario = _usuario_del_token(authorization[7:].strip())
    if usuario["rol"] not in ROLES_VALIDOS:
        raise HTTPException(status_code=403, detail="Usuario sin acceso")
    return usuario


def requerir_usuario(authorization: str | None = Header(default=None)) -> dict:
    return _usuario_desde_header(authorization)


def requerir_admin(authorization: str | None = Header(default=None)) -> dict:
    usuario = _usuario_desde_header(authorization)
    if usuario["rol"] != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return usuario


def requerir_usuario_o_cron(
    authorization: str | None = Header(default=None),
    x_cron_key: str | None = Header(default=None),
) -> dict:
    if CRON_SECRET and x_cron_key and secrets.compare_digest(x_cron_key, CRON_SECRET):
        return {"email": "cron", "rol": "cron"}
    return _usuario_desde_header(authorization)