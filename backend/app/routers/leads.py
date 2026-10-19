from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import requerir_admin
from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead_schema import LeadActualizar, LeadDetalle, LeadRespuesta
from app.services.actividad import registrar

router = APIRouter(prefix="/leads", tags=["Leads"], dependencies=[Depends(requerir_admin)])


@router.get("/", response_model=List[LeadRespuesta])
def listar_leads(db: Session = Depends(get_db)):
    return db.query(Lead).order_by(Lead.creado_en.desc()).all()


@router.get("/{lead_id}", response_model=LeadDetalle)
def detalle_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return lead


@router.patch("/{lead_id}", response_model=LeadRespuesta)
def actualizar_lead(
    lead_id: int,
    datos: LeadActualizar,
    usuario: dict = Depends(requerir_admin),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    cambios = datos.model_dump(exclude_unset=True)
    piezas = []

    if cambios.get("estado") is not None:
        if cambios["estado"] != lead.estado:
            piezas.append(f"estado de «{lead.estado}» a «{cambios['estado']}»")
        lead.estado = cambios["estado"]
    if "notas" in cambios:
        nuevas = (cambios["notas"] or "").strip() or None
        if nuevas != lead.notas:
            piezas.append("actualizó las notas")
        lead.notas = nuevas

    db.commit()
    db.refresh(lead)

    if piezas:
        registrar(db, usuario, "lead_actualizado", "lead", lead.id,
                  f"Lead #{lead.id}: " + ", ".join(piezas) + ".")
        db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_lead(lead_id: int, usuario: dict = Depends(requerir_admin), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    db.delete(lead)
    db.commit()
    registrar(db, usuario, "lead_eliminado", "lead", lead_id,
              f"Eliminó el lead #{lead_id} y sus datos personales.")