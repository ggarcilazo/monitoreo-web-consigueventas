import os
import secrets
import time

import httpx
from fastapi import Header, HTTPException

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
CRON_SECRET = os.getenv("CRON_SECRET", "")
USUARIOS_PERMITIDOS = {
    e.strip().lower() for e in os.getenv("USUARIOS_PERMITIDOS", "").split(",") if e.strip()
}

_CACHE_SEGUNDOS = 60
_cache: dict[str, tuple[str, float]] = {}


def _email_del_token(token: str) -> str:
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

    email = (r.json().get("email") or "").lower()
    if len(_cache) > 200:
        _cache.clear()
    _cache[token] = (email, ahora + _CACHE_SEGUNDOS)
    return email


def _usuario_desde_header(authorization):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    email = _email_del_token(authorization[7:].strip())
    if USUARIOS_PERMITIDOS and email not in USUARIOS_PERMITIDOS:
        raise HTTPException(status_code=403, detail="Usuario sin acceso")
    return email


def requerir_usuario(authorization: str | None = Header(default=None)) -> str:
    return _usuario_desde_header(authorization)


def requerir_usuario_o_cron(
    authorization: str | None = Header(default=None),
    x_cron_key: str | None = Header(default=None),
) -> str:
    if CRON_SECRET and x_cron_key and secrets.compare_digest(x_cron_key, CRON_SECRET):
        return "cron"
    return _usuario_desde_header(authorization)