import os
import time
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.ajuste import Ajuste

_TTL_SEG = 15
_cache: dict = {"t": 0.0, "datos": {}}


def invalidar() -> None:
    _cache["t"] = 0.0


def _cargar(db: Session) -> dict:
    ahora = time.time()
    if ahora - _cache["t"] > _TTL_SEG:
        try:
            _cache["datos"] = {a.clave: a.valor for a in db.query(Ajuste).all()}
            _cache["t"] = ahora
        except Exception:
            db.rollback()
    return _cache["datos"]


def obtener(db: Session, clave: str, defecto: Optional[str] = None) -> Optional[str]:
    return _cargar(db).get(clave, defecto)


def guardar(db: Session, clave: str, valor, usuario_email: Optional[str] = None) -> None:
    fila = db.query(Ajuste).filter(Ajuste.clave == clave).first()
    if fila:
        fila.valor = str(valor)
        fila.actualizado_por = usuario_email
    else:
        db.add(Ajuste(clave=clave, valor=str(valor), actualizado_por=usuario_email))


def diagnostico_activo(db: Session) -> Tuple[bool, str]:
    """Devuelve (encendido, origen). El panel manda; si nunca se tocó, se usa el .env."""
    valor = obtener(db, "diagnostico_publico")
    if valor is not None:
        return valor == "on", "panel"
    return os.getenv("AUDITORIA_PUBLICA", "off").lower() == "on", "servidor"


def umbral_ssl_dias(db: Session) -> int:
    try:
        return int(obtener(db, "umbral_ssl_dias", "15"))
    except (TypeError, ValueError):
        return 15