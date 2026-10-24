# backend/app/api/competences.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.competence import Competence, CategorieCompetenceEnum
from app.services.sync_service import sync_service
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/competences", tags=["competences"])

class CompetenceCreate(BaseModel):
    nom: str
    categorie: str = "autre"

class CompetenceResponse(BaseModel):
    id: int
    nom: str
    categorie: str
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[CompetenceResponse])
async def get_competences(
    categorie: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Récupérer toutes les compétences"""
    try:
        query = db.query(Competence)
        if categorie:
            query = query.filter(Competence.categorie == categorie)
        return query.all()
    except Exception as e:
        logger.error(f"❌ Erreur GET competences: {e}")
        raise HTTPException(500, detail=str(e))


@router.post("", response_model=CompetenceResponse, status_code=201)
async def create_competence(
    data: CompetenceCreate,
    db: Session = Depends(get_db)
):
    """Créer une nouvelle compétence - AVEC SYNCHRONISATION OWL"""
    try:
        # Vérifier si la compétence existe déjà
        existing = db.query(Competence).filter(Competence.nom == data.nom).first()
        if existing:
            raise HTTPException(400, detail="Cette compétence existe déjà")
        
        # Convertir la chaîne en énumération
        try:
            categorie_enum = CategorieCompetenceEnum(data.categorie.lower())
        except ValueError:
            raise HTTPException(400, detail=f"Catégorie invalide: {data.categorie}")
        
        # Créer la compétence
        competence = Competence(
            nom=data.nom,
            categorie=categorie_enum
        )
        db.add(competence)
        db.commit()
        db.refresh(competence)
        
        logger.info(f"✅ Compétence créée: {competence.nom} (ID: {competence.id})")
        
        # ⭐ Synchroniser avec l'ontologie OWL
        try:
            logger.info(f"🔄 Synchronisation de la compétence {competence.nom} avec l'ontologie...")
            
            sync_service.sync_competence(
                competence_id=competence.id,
                nom=competence.nom,
                categorie=competence.categorie.value,
                operation="add",
                db=db
            )
            
            logger.info(f"✅ Compétence {competence.nom} synchronisée avec l'ontologie")
            
        except Exception as e:
            logger.error(f"❌ Erreur synchronisation OWL: {e}")
            # On ne bloque pas la création si la sync échoue
        
        return competence
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur POST competence: {e}")
        raise HTTPException(500, detail=str(e))


@router.delete("/{competence_id}")
async def delete_competence(
    competence_id: int,
    db: Session = Depends(get_db)
):
    """Supprimer une compétence - AVEC SYNCHRONISATION OWL"""
    try:
        competence = db.query(Competence).filter(Competence.id == competence_id).first()
        if not competence:
            raise HTTPException(404, detail="Compétence non trouvée")
        
        nom = competence.nom
        
        # ⭐ Synchroniser avec l'ontologie OWL (suppression)
        try:
            logger.info(f"🔄 Suppression de la compétence {nom} de l'ontologie...")
            
            # Supprimer de l'ontologie
            from app.services.ontology_service import ontology_service
            comp_uri = ontology_service.ns[f"Competence_{competence_id}"]
            ontology_service.graph.remove((comp_uri, None, None))
            ontology_service.save_ontology()
            
            logger.info(f"✅ Compétence {nom} supprimée de l'ontologie")
            
        except Exception as e:
            logger.error(f"❌ Erreur suppression OWL: {e}")
            # On ne bloque pas la suppression si la sync échoue
        
        # Supprimer de la base de données
        db.delete(competence)
        db.commit()
        
        logger.info(f"✅ Compétence {nom} supprimée de la base de données")
        
        return {"message": "Compétence supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur DELETE competence: {e}")
        raise HTTPException(500, detail=str(e))