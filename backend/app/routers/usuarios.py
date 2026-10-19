from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import requerir_admin
from app.database import get_db
from app.services.actividad import registrar

router = APIRouter(prefix="/usuarios", tags=["Usuarios"], dependencies=[Depends(requerir_admin)])

_SELECT = """
    SELECT CAST(id AS text) AS id,
           email,
           raw_app_meta_data ->> 'rol' AS rol,
           last_sign_in_at AS ultimo_acceso,
           created_at AS creado_en,
           (email_confirmed_at IS NOT NULL) AS confirmado,
           (banned_until IS NOT NULL AND banned_until > now()) AS suspendido
    FROM auth.users
    WHERE deleted_at IS NULL
"""


class UsuarioRespuesta(BaseModel):
    id: str
    email: Optional[str] = None
    rol: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None
    creado_en: datetime
    confirmado: bool
    suspendido: bool
    es_yo: bool = False


class UsuarioActualizar(BaseModel):
    rol: Optional[Literal["admin", "lector"]] = None
    quitar_rol: Optional[bool] = None
    suspendido: Optional[bool] = None


def _a_respuesta(fila, yo_id: str) -> UsuarioRespuesta:
    datos = dict(fila._mapping)
    datos["es_yo"] = datos["id"] == yo_id
    return UsuarioRespuesta(**datos)


@router.get("/", response_model=List[UsuarioRespuesta])
def listar_usuarios(yo: dict = Depends(requerir_admin), db: Session = Depends(get_db)):
    filas = db.execute(text(_SELECT + " ORDER BY created_at")).all()
    return [_a_respuesta(f, yo.get("id", "")) for f in filas]


@router.patch("/{usuario_id}", response_model=UsuarioRespuesta)
def actualizar_usuario(
    usuario_id: UUID,
    datos: UsuarioActualizar,
    yo: dict = Depends(requerir_admin),
    db: Session = Depends(get_db),
):
    uid = str(usuario_id)
    if uid == yo.get("id"):
        raise HTTPException(status_code=400, detail="No puedes modificar tu propia cuenta desde aquí.")

    existe = db.execute(
        text("SELECT 1 FROM auth.users WHERE id = CAST(:id AS uuid) AND deleted_at IS NULL"),
        {"id": uid},
    ).first()
    if not existe:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cambios = datos.model_dump(exclude_unset=True)
    try:
        if cambios.get("quitar_rol"):
            db.execute(
                text("UPDATE auth.users "
                     "SET raw_app_meta_data = COALESCE(raw_app_meta_data, CAST('{}' AS jsonb)) - CAST('rol' AS text), "
                     "updated_at = now() WHERE id = CAST(:id AS uuid)"),
                {"id": uid},
            )
        elif cambios.get("rol"):
            db.execute(
                text("UPDATE auth.users "
                     "SET raw_app_meta_data = COALESCE(raw_app_meta_data, CAST('{}' AS jsonb)) "
                     "|| jsonb_build_object('rol', CAST(:rol AS text)), "
                     "updated_at = now() WHERE id = CAST(:id AS uuid)"),
                {"rol": cambios["rol"], "id": uid},
            )

        if cambios.get("suspendido") is True:
            db.execute(
                text("UPDATE auth.users SET banned_until = CAST('infinity' AS timestamptz), "
                     "updated_at = now() WHERE id = CAST(:id AS uuid)"),
                {"id": uid},
            )
        elif cambios.get("suspendido") is False:
            db.execute(
                text("UPDATE auth.users SET banned_until = NULL, "
                     "updated_at = now() WHERE id = CAST(:id AS uuid)"),
                {"id": uid},
            )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar el usuario.")
    
    fila = db.execute(text(_SELECT + " AND id = CAST(:id AS uuid)"), {"id": uid}).first()
    respuesta = _a_respuesta(fila, yo.get("id", ""))

    piezas = []
    if cambios.get("quitar_rol"):
        piezas.append("le quitó el acceso (sin rol)")
    elif cambios.get("rol"):
        piezas.append("le asignó el rol " + ("Administrador" if cambios["rol"] == "admin" else "Lector"))
    if cambios.get("suspendido") is True:
        piezas.append("suspendió la cuenta")
    elif cambios.get("suspendido") is False:
        piezas.append("reactivó la cuenta")
    if piezas:
        registrar(db, yo, "usuario_modificado", "usuario", uid,
                  f"Cuenta {respuesta.email}: " + ", ".join(piezas) + ".",
                  {"campos": list(cambios.keys())})
    return respuesta