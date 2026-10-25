# backend/app/api/departements.py
"""
Routes API pour les départements
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_entreprise
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.entreprise import Entreprise
from app.models.departement import Departement
from pydantic import BaseModel, field_validator
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/departements", tags=["departements"])

class DepartementCreate(BaseModel):
    nom: str
    description: Optional[str] = None

class DepartementResponse(BaseModel):
    id: int
    entreprise_id: int
    nom: str
    description: Optional[str] = None
    owl_iri: Optional[str] = None
    date_creation: str
    date_modification: Optional[str] = None
    
    @field_validator('date_creation', mode='before')
    @classmethod
    def convert_date_creation(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    @field_validator('date_modification', mode='before')
    @classmethod
    def convert_date_modification(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    class Config:
        from_attributes = True


# ⭐ ACCEPTE LES DEUX URLS (avec et sans slash)
@router.get("/", response_model=List[DepartementResponse])
@router.get("", response_model=List[DepartementResponse])
async def get_departements(
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer tous les départements de l'entreprise connectée.
    Supporte les deux URLs : /api/departements/ et /api/departements
    """
    try:
        logger.info(
            f"🔍 [/api/departements] user_id={current_user.id}, "
            f"email={current_user.email}, role={current_user.role}"
        )
        
        # ─────────────────────────────────────────────
        # ADMIN → voit tous les départements
        # ─────────────────────────────────────────────
        if current_user.role == RoleEnum.ADMIN:
            departements = db.query(Departement).all()
            logger.info(f"📊 [/api/departements] ADMIN → {len(departements)} départements totaux")
            return departements
        
        # ─────────────────────────────────────────────
        # ENTREPRISE → voit ses propres départements
        # ─────────────────────────────────────────────
        if current_user.role == RoleEnum.ENTREPRISE:
            entreprise = db.query(Entreprise).filter(
                Entreprise.utilisateur_id == current_user.id
            ).first()
            
            if not entreprise:
                logger.warning(
                    f"⚠️ [/api/departements] Aucune entreprise pour "
                    f"utilisateur_id={current_user.id} → renvoi []"
                )
                return []
            
            logger.info(
                f"✅ [/api/departements] Entreprise: {entreprise.nom} "
                f"(ID={entreprise.id})"
            )
            
            departements = db.query(Departement).filter(
                Departement.entreprise_id == entreprise.id
            ).all()
            
            logger.info(
                f"📊 [/api/departements] {len(departements)} départements "
                f"pour entreprise_id={entreprise.id}"
            )
            return departements
        
        # ─────────────────────────────────────────────
        # CANDIDAT → aucun accès
        # ─────────────────────────────────────────────
        if current_user.role == RoleEnum.CANDIDAT:
            logger.warning(
                f"⚠️ [/api/departements] Candidat {current_user.email} "
                f"tente d'accéder aux départements → renvoi []"
            )
            return []
        
        # ─────────────────────────────────────────────
        # Rôle inconnu → aucun accès
        # ─────────────────────────────────────────────
        logger.warning(
            f"⚠️ [/api/departements] Rôle non autorisé: {current_user.role}"
        )
        return []
        
    except HTTPException:
        raise
    except Exception as e:
        # ⭐⭐⭐ CORRECTION CRITIQUE ⭐⭐⭐
        # Ne PAS masquer l'erreur en retournant []
        # Sinon le frontend reçoit 200 [] et on ne voit jamais le vrai problème
        logger.error(f"❌ [/api/departements] Erreur: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des départements: {str(e)}"
        )


@router.post("/", response_model=DepartementResponse, status_code=status.HTTP_201_CREATED)
async def create_departement(
    data: DepartementCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Créer un nouveau département (Entreprise uniquement)
    """
    try:
        logger.info(f"📝 [/api/departements POST] Création par {current_user.email}")
        
        # Récupérer l'entreprise
        entreprise = db.query(Entreprise).filter(
            Entreprise.utilisateur_id == current_user.id
        ).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil entreprise non trouvé"
            )
        
        logger.info(
            f"✅ Entreprise trouvée: {entreprise.nom} (ID={entreprise.id})"
        )
        
        # Vérifier si le département existe déjà
        existing = db.query(Departement).filter(
            Departement.entreprise_id == entreprise.id,
            Departement.nom == data.nom
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un département avec le nom '{data.nom}' existe déjà"
            )
        
        # Créer le département
        departement = Departement(
            entreprise_id=entreprise.id,
            nom=data.nom,
            description=data.description
        )
        
        db.add(departement)
        db.commit()
        db.refresh(departement)
        
        logger.info(
            f"✅ Département créé: {departement.nom} (ID={departement.id})"
        )
        
        return departement
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [/api/departements POST] Erreur: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{departement_id}", response_model=DepartementResponse)
async def update_departement(
    departement_id: int,
    data: DepartementCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Mettre à jour un département (Entreprise uniquement)
    """
    try:
        departement = db.query(Departement).filter(
            Departement.id == departement_id
        ).first()
        if not departement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Département non trouvé"
            )
        
        # Vérifier l'accès
        entreprise = db.query(Entreprise).filter(
            Entreprise.utilisateur_id == current_user.id
        ).first()
        if not entreprise or departement.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce département"
            )
        
        departement.nom = data.nom
        departement.description = data.description
        db.commit()
        db.refresh(departement)
        
        logger.info(f"✅ Département {departement.id} mis à jour")
        return departement
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [/api/departements PUT] Erreur: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{departement_id}")
async def delete_departement(
    departement_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Supprimer un département (Entreprise uniquement)
    """
    try:
        departement = db.query(Departement).filter(
            Departement.id == departement_id
        ).first()
        if not departement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Département non trouvé"
            )
        
        # Vérifier l'accès
        entreprise = db.query(Entreprise).filter(
            Entreprise.utilisateur_id == current_user.id
        ).first()
        if not entreprise or departement.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce département"
            )
        
        db.delete(departement)
        db.commit()
        
        logger.info(f"✅ Département {departement_id} supprimé")
        return {"message": "Département supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [/api/departements DELETE] Erreur: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )