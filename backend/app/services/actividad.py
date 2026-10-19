from typing import Optional

from sqlalchemy.orm import Session

from app.models.actividad import Actividad


def registrar(
    db: Session,
    usuario: Optional[dict],
    accion: str,
    entidad: str,
    entidad_id=None,
    descripcion: str = "",
    detalle: Optional[dict] = None,
) -> None:
    """Guarda un evento en el registro. Nunca debe romper la acción principal."""
    try:
        db.add(Actividad(
            usuario_email=(usuario or {}).get("email") or "sistema",
            usuario_id=(usuario or {}).get("id") or None,
            accion=accion,
            entidad=entidad,
            entidad_id=str(entidad_id) if entidad_id is not None else None,
            descripcion=(descripcion or "")[:300],
            detalle=detalle,
        ))
        db.commit()
    except Exception:
        db.rollback()