# backend/app/api/entreprises.py
"""
Routes API pour la gestion des entreprises
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_entreprise
from app.models.utilisateur import Utilisateur
from app.models.entreprise import Entreprise
from app.schemas.entreprise import EntrepriseCreate, EntrepriseUpdate, EntrepriseResponse
from app.services.sync_service import sync_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/entreprises", tags=["entreprises"])


@router.get("/me", response_model=EntrepriseResponse)
async def get_mon_entreprise(
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Obtenir les informations de mon entreprise"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil entreprise non trouvé"
        )
    return entreprise


@router.put("/me", response_model=EntrepriseResponse)
async def update_mon_entreprise(
    entreprise_update: EntrepriseUpdate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Mettre à jour les informations de mon entreprise"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil entreprise non trouvé"
        )
    
    # Utilisation de model_dump pour compatibilité Pydantic v2
    update_data = entreprise_update.model_dump(exclude_unset=True) if hasattr(entreprise_update, 'model_dump') else entreprise_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(entreprise, field, value)
    
    db.commit()
    db.refresh(entreprise)
    
    # Synchronisation OWL non-bloquante
    try:
        sync_service.sync_entreprise(entreprise.id, entreprise.nom, "update", db)
    except Exception as e:
        logger.error(f"❌ Erreur de synchro sémantique entreprise (non-bloquant): {e}")
    
    return entreprise


@router.post("/me/logo")
async def upload_mon_logo(
    fichier: UploadFile = File(...),
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Uploader le logo de l'entreprise"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(status_code=404, detail="Profil entreprise non trouvé")
    
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Le fichier dépasse la limite maximale de 10 Mo")
    
    entreprise.logo_blob = contenu
    entreprise.logo_type = fichier.content_type or "image/png"
    db.commit()
    
    return {
        "message": "Logo mis à jour avec succès",
        "logo_url": f"/api/entreprises/{entreprise.id}/logo"
    }


@router.get("/by-utilisateur/{user_id}/logo")
async def get_logo_entreprise_by_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == user_id).first()
    if not entreprise or not entreprise.logo_blob:
        raise HTTPException(status_code=404, detail="Logo non trouvé")
    return Response(content=entreprise.logo_blob, media_type=entreprise.logo_type or "image/png")


@router.get("/{entreprise_id}/logo")
async def get_logo_entreprise(
    entreprise_id: int,
    db: Session = Depends(get_db)
):
    """Obtenir le logo d'une entreprise"""
    entreprise = db.query(Entreprise).filter(Entreprise.id == entreprise_id).first()
    if not entreprise or not entreprise.logo_blob:
        raise HTTPException(status_code=404, detail="Logo non trouvé")
    
    return Response(
        content=entreprise.logo_blob,
        media_type=entreprise.logo_type or "image/png",
        headers={"Cache-Control": "public, max-age=86400"}
    )


@router.get("/{entreprise_id}", response_model=EntrepriseResponse)
async def get_entreprise(
    entreprise_id: int,
    db: Session = Depends(get_db)
):
    """Obtenir les informations d'une entreprise par son ID"""
    entreprise = db.query(Entreprise).filter(Entreprise.id == entreprise_id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée"
        )
    return entreprise