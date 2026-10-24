# backend/app/api/contrats.py
"""
Routes API pour la gestion des contrats
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.contrat import Contrat, TypeContratEnum
from pydantic import BaseModel, ConfigDict
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contrats", tags=["contrats"])


class ContratCreate(BaseModel):
    type_contrat: str


class ContratResponse(BaseModel):
    id: int
    type_contrat: str

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[ContratResponse])
async def get_contrats(db: Session = Depends(get_db)):
    """Récupérer la liste de tous les contrats"""
    try:
        contrats = db.query(Contrat).all()
        # Conversion sûre pour éviter les erreurs de sérialisation d'Enum
        resultats = []
        for c in contrats:
            type_val = c.type_contrat.value if hasattr(c.type_contrat, 'value') else str(c.type_contrat)
            resultats.append(ContratResponse(id=c.id, type_contrat=type_val))
        return resultats
    except Exception as e:
        logger.error(f"❌ Erreur GET contrats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ContratResponse, status_code=status.HTTP_201_CREATED)
async def create_contrat(data: ContratCreate, db: Session = Depends(get_db)):
    """Créer un nouveau type de contrat"""
    try:
        type_str = data.type_contrat.strip().lower()
        
        # Vérifier si le contrat existe déjà
        existing = db.query(Contrat).filter(Contrat.type_contrat == type_str).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ce type de contrat existe déjà")
        
        # Tentative de conversion de l'Enum
        try:
            type_enum = TypeContratEnum(type_str)
        except ValueError:
            # Fallback si l'enum attend des majuscules
            try:
                type_enum = TypeContratEnum(type_str.upper())
            except ValueError:
                type_enum = type_str

        contrat = Contrat(type_contrat=type_enum)
        db.add(contrat)
        db.commit()
        db.refresh(contrat)
        
        type_val = contrat.type_contrat.value if hasattr(contrat.type_contrat, 'value') else str(contrat.type_contrat)
        return ContratResponse(id=contrat.id, type_contrat=type_val)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur POST contrat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{contrat_id}")
async def delete_contrat(contrat_id: int, db: Session = Depends(get_db)):
    """Supprimer un contrat par son ID"""
    try:
        contrat = db.query(Contrat).filter(Contrat.id == contrat_id).first()
        if not contrat:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        db.delete(contrat)
        db.commit()
        return {"message": "Contrat supprimé avec succès"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur DELETE contrat: {e}")
        raise HTTPException(status_code=500, detail=str(e))