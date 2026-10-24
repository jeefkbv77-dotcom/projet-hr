# backend/app/api/admin.py
"""
Routes API pour l'administration
"""
import logging
import sys
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.candidature import Candidature
from app.models.competence import Competence
from app.models.offre import OffreEmploi, StatutOffreEnum
from app.services.ontology_service import ontology_service
from pydantic import BaseModel, Field

# Configuration du logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["administration"])


# ============== MODÈLES PYDANTIC ==============
class StatistiquesResponse(BaseModel):
    total_utilisateurs: int = Field(..., description="Nombre total d'utilisateurs")
    total_candidats: int = Field(..., description="Nombre total de candidats")
    total_entreprises: int = Field(..., description="Nombre total d'entreprises")
    total_offres: int = Field(..., description="Nombre total d'offres")
    total_candidatures: int = Field(..., description="Nombre total de candidatures")
    total_competences: int = Field(..., description="Nombre total de compétences")
    utilisateurs_actifs: int = Field(..., description="Nombre d'utilisateurs actifs")
    offres_actives: int = Field(..., description="Nombre d'offres actives")
    
    class Config:
        from_attributes = True


class UtilisateurResponse(BaseModel):
    id: int
    email: str
    role: str
    actif: bool
    date_creation: datetime
    
    class Config:
        from_attributes = True


class UtilisateurListResponse(BaseModel):
    utilisateurs: List[UtilisateurResponse]
    total: int


class MessageResponse(BaseModel):
    message: str


class OntologyStatusResponse(BaseModel):
    total_triples: int = 0
    total_classes: int = 0
    total_properties: int = 0
    total_individuals: int = 0
    total_candidats: int = 0
    total_entreprises: int = 0
    total_offres: int = 0
    total_employes: int = 0
    total_competences: int = 0
    total_candidatures: int = 0
    error: Optional[str] = None


# ============== ROUTES STATISTIQUES ==============
@router.get(
    "/statistiques", 
    response_model=StatistiquesResponse,
    summary="Obtenir les statistiques globales"
)
async def get_statistiques(
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtenir les statistiques globales de la plateforme"""
    try:
        total_utilisateurs = db.query(func.count(Utilisateur.id)).scalar() or 0
        total_candidats = db.query(func.count(Utilisateur.id)).filter(
            Utilisateur.role == RoleEnum.CANDIDAT
        ).scalar() or 0
        total_entreprises = db.query(func.count(Utilisateur.id)).filter(
            Utilisateur.role == RoleEnum.ENTREPRISE
        ).scalar() or 0
        utilisateurs_actifs = db.query(func.count(Utilisateur.id)).filter(
            Utilisateur.actif == True
        ).scalar() or 0
        
        total_offres = db.query(func.count(OffreEmploi.id)).scalar() or 0
        offres_actives = db.query(func.count(OffreEmploi.id)).filter(
            OffreEmploi.statut == StatutOffreEnum.ACTIVE
        ).scalar() or 0
        total_candidatures = db.query(func.count(Candidature.id)).scalar() or 0
        total_competences = db.query(func.count(Competence.id)).scalar() or 0
        
        logger.info(f"Statistiques récupérées par l'admin {current_user.email}")
        
        return StatistiquesResponse(
            total_utilisateurs=total_utilisateurs,
            total_candidats=total_candidats,
            total_entreprises=total_entreprises,
            total_offres=total_offres,
            total_candidatures=total_candidatures,
            total_competences=total_competences,
            utilisateurs_actifs=utilisateurs_actifs,
            offres_actives=offres_actives
        )
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des statistiques"
        )


# ============== ROUTES UTILISATEURS ==============
@router.get(
    "/utilisateurs/recents",
    response_model=List[UtilisateurResponse],
    summary="Obtenir les utilisateurs récents"
)
async def get_utilisateurs_recents(
    limit: int = Query(5, ge=1, le=50, description="Nombre d'utilisateurs à récupérer"),
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtenir les utilisateurs récents (limité à 50 max)"""
    try:
        utilisateurs = db.query(Utilisateur).order_by(
            desc(Utilisateur.date_creation)
        ).limit(limit).all()
        
        logger.info(f"Récupération de {len(utilisateurs)} utilisateurs récents par admin {current_user.email}")
        return utilisateurs
    except Exception as e:
        logger.error(f"Erreur get_utilisateurs_recents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des utilisateurs récents: {str(e)}"
        )


@router.get(
    "/utilisateurs", 
    response_model=UtilisateurListResponse,
    summary="Obtenir la liste des utilisateurs"
)
async def get_utilisateurs(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre d'éléments à retourner"),
    role: Optional[str] = Query(None, description="Filtrer par rôle"),
    actif: Optional[bool] = Query(None, description="Filtrer par statut actif/inactif"),
    search: Optional[str] = Query(None, description="Rechercher dans l'email"),
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtenir la liste des utilisateurs avec filtres optionnels"""
    try:
        query = db.query(Utilisateur)
        
        if role:
            try:
                role_enum = RoleEnum(role.lower())
                query = query.filter(Utilisateur.role == role_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Rôle invalide. Valeurs acceptées: {[r.value for r in RoleEnum]}"
                )
        
        if actif is not None:
            query = query.filter(Utilisateur.actif == actif)
        
        if search:
            query = query.filter(Utilisateur.email.ilike(f"%{search}%"))
        
        total = query.count()
        utilisateurs = query.order_by(
            desc(Utilisateur.date_creation)
        ).offset(skip).limit(limit).all()
        
        logger.info(f"Récupération de {len(utilisateurs)} utilisateurs (total: {total}) par admin {current_user.email}")
        
        return UtilisateurListResponse(
            utilisateurs=utilisateurs,
            total=total
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_utilisateurs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des utilisateurs: {str(e)}"
        )


@router.get(
    "/utilisateurs/{utilisateur_id}", 
    response_model=UtilisateurResponse,
    summary="Obtenir les détails d'un utilisateur"
)
async def get_utilisateur(
    utilisateur_id: int,
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtenir les détails d'un utilisateur spécifique"""
    try:
        utilisateur = db.query(Utilisateur).filter(
            Utilisateur.id == utilisateur_id
        ).first()
        
        if not utilisateur:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Utilisateur avec l'ID {utilisateur_id} non trouvé"
            )
        
        logger.info(f"Admin {current_user.email} a consulté l'utilisateur {utilisateur.email}")
        return utilisateur
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_utilisateur {utilisateur_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération de l'utilisateur: {str(e)}"
        )


@router.put(
    "/utilisateurs/{utilisateur_id}/activer",
    response_model=MessageResponse,
    summary="Activer un utilisateur"
)
async def activer_utilisateur(
    utilisateur_id: int,
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activer un utilisateur désactivé"""
    try:
        utilisateur = db.query(Utilisateur).filter(
            Utilisateur.id == utilisateur_id
        ).first()
        
        if not utilisateur:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Utilisateur avec l'ID {utilisateur_id} non trouvé"
            )
        
        if utilisateur.actif:
            return MessageResponse(message=f"L'utilisateur {utilisateur.email} est déjà actif")
        
        utilisateur.actif = True
        db.commit()
        
        logger.info(f"Admin {current_user.email} a activé l'utilisateur {utilisateur.email}")
        return MessageResponse(message=f"Utilisateur {utilisateur.email} activé avec succès")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur activer_utilisateur {utilisateur_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'activation de l'utilisateur: {str(e)}"
        )


@router.put(
    "/utilisateurs/{utilisateur_id}/desactiver",
    response_model=MessageResponse,
    summary="Désactiver un utilisateur"
)
async def desactiver_utilisateur(
    utilisateur_id: int,
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Désactiver un utilisateur actif"""
    try:
        utilisateur = db.query(Utilisateur).filter(
            Utilisateur.id == utilisateur_id
        ).first()
        
        if not utilisateur:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Utilisateur avec l'ID {utilisateur_id} non trouvé"
            )
        
        if utilisateur.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas désactiver votre propre compte"
            )
        
        if not utilisateur.actif:
            return MessageResponse(message=f"L'utilisateur {utilisateur.email} est déjà désactivé")
        
        utilisateur.actif = False
        db.commit()
        
        logger.info(f"Admin {current_user.email} a désactivé l'utilisateur {utilisateur.email}")
        return MessageResponse(message=f"Utilisateur {utilisateur.email} désactivé avec succès")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur desactiver_utilisateur {utilisateur_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la désactivation de l'utilisateur: {str(e)}"
        )


@router.delete(
    "/utilisateurs/{utilisateur_id}",
    response_model=MessageResponse,
    summary="Supprimer un utilisateur"
)
async def supprimer_utilisateur(
    utilisateur_id: int,
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Supprimer définitivement un utilisateur"""
    try:
        utilisateur = db.query(Utilisateur).filter(
            Utilisateur.id == utilisateur_id
        ).first()
        
        if not utilisateur:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Utilisateur avec l'ID {utilisateur_id} non trouvé"
            )
        
        if utilisateur.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas supprimer votre propre compte"
            )
        
        email = utilisateur.email
        db.delete(utilisateur)
        db.commit()
        
        logger.warning(f"Admin {current_user.email} a supprimé l'utilisateur {email}")
        return MessageResponse(message=f"Utilisateur {email} supprimé avec succès")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur supprimer_utilisateur {utilisateur_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression de l'utilisateur: {str(e)}"
        )


# ============== ROUTES ONTOLOGIE ==============
@router.get(
    "/ontology-status",
    response_model=OntologyStatusResponse,
    summary="Obtenir le statut de l'ontologie"
)
async def get_ontology_status(
    current_user: Utilisateur = Depends(get_current_admin)
):
    """Obtenir le statut en temps réel de l'ontologie OWL"""
    try:
        stats = ontology_service.get_statistiques()
        logger.info(f"Statut de l'ontologie récupéré par admin {current_user.email}")
        return OntologyStatusResponse(**stats)
    except Exception as e:
        logger.error(f"Erreur get_ontology_status: {e}")
        return OntologyStatusResponse(
            error=str(e)
        )


@router.post(
    "/resync-ontology",
    response_model=dict,
    summary="Resynchroniser l'ontologie"
)
async def resync_ontology(
    current_user: Utilisateur = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resynchroniser manuellement l'ontologie OWL à partir de MySQL"""
    try:
        # Ajouter le chemin du projet root pour importer ontology
        current_file = os.path.abspath(__file__)
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
        project_root = os.path.dirname(backend_dir)
        
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        
        # Importer depuis le dossier ontology racine
        from ontology.init_from_db import initialize_ontology_from_db
        
        logger.info(f"Admin {current_user.email} a lancé une resynchronisation de l'ontologie")
        logger.info(f"📁 Project root: {project_root}")
        
        # Vérifier la connexion à la DB
        try:
            db.execute(text("SELECT 1"))
            logger.info("✅ Connexion à la base de données OK")
        except Exception as db_error:
            logger.error(f"❌ Erreur de connexion DB: {db_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur de connexion à la base de données: {str(db_error)}"
            )
        
        # Exécuter la resynchronisation
        try:
            logger.info("🔄 Appel de initialize_ontology_from_db...")
            succes = initialize_ontology_from_db()
            logger.info(f"📊 Résultat de initialize_ontology_from_db: {succes}")
        except Exception as init_error:
            logger.error(f"❌ Erreur dans initialize_ontology_from_db: {init_error}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur d'initialisation: {str(init_error)}"
            )
        
        if succes:
            stats = ontology_service.get_statistiques()
            return {
                "message": "✅ Ontologie resynchronisée avec succès depuis MySQL",
                "stats": stats
            }
        else:
            logger.error("❌ Échec de la resynchronisation de l'ontologie")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Échec de la resynchronisation de l'ontologie"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur resync_ontology: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la resynchronisation: {str(e)}"
        )


# ============== ROUTES SUPPLEMENTAIRES ==============
@router.get(
    "/health",
    response_model=dict,
    summary="Vérifier l'état de l'API admin",
    include_in_schema=False
)
async def health_check(
    current_user: Utilisateur = Depends(get_current_admin)
):
    """Endpoint de santé pour vérifier que l'API admin fonctionne"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "admin": current_user.email
    }