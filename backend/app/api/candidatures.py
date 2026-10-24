# backend/app/api/candidatures.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_entreprise, get_current_candidat, get_current_user
from app.models.utilisateur import Utilisateur, RoleEnum, ProfilStatutEnum, HistoriqueStatutProfil
from app.models.candidat import Candidat
from app.models.entreprise import Entreprise
from app.models.offre import OffreEmploi
from app.models.candidature import Candidature, StatutCandidatureEnum
from app.models.employe import Employe
from app.schemas.candidature import CandidatureResponse, CandidatureUpdate
from app.services.sync_service import sync_service  # ⭐ AJOUTÉ
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/candidatures", tags=["candidatures"])

class ConvertEmployeData(BaseModel):
    poste_id: Optional[int] = None
    departement_id: Optional[int] = None
    contrat_id: Optional[int] = None
    date_embauche: Optional[str] = None
    titre_poste: Optional[str] = None


@router.get("/mes-candidatures", response_model=List[CandidatureResponse])
async def get_mes_candidatures(
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les candidatures reçues par l'entreprise"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée"
        )
    
    # Récupérer toutes les offres de l'entreprise
    offres = db.query(OffreEmploi).filter(OffreEmploi.entreprise_id == entreprise.id).all()
    offre_ids = [offre.id for offre in offres]
    
    if not offre_ids:
        return []
    
    # Récupérer les candidatures
    candidatures = db.query(Candidature).filter(Candidature.offre_id.in_(offre_ids)).all()
    
    # Ajouter les informations du candidat et de l'offre
    result = []
    for candidature in candidatures:
        candidat = db.query(Candidat).filter(Candidat.id == candidature.candidat_id).first()
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == candidature.offre_id).first()
        
        # ⭐ Vérifier si le candidat a une lettre de motivation
        a_lettre = (
            candidat.lettre_motivation_blob is not None and 
            len(candidat.lettre_motivation_blob) > 0
        ) if candidat else False
        
        candidature_dict = {
            "id": candidature.id,
            "candidat_id": candidature.candidat_id,
            "offre_id": candidature.offre_id,
            "statut": candidature.statut,
            "date_candidature": candidature.date_candidature,
            "date_modification": candidature.date_modification,
            "date_entretien": candidature.date_entretien,
            "notes": candidature.notes,
            "candidat_nom": candidat.nom if candidat else "",
            "candidat_prenom": candidat.prenom if candidat else "",
            "offre_titre": offre.titre if offre else "",
            "entreprises_nom": entreprise.nom,
            "a_cv": candidat.a_cv if candidat else False,  # ⭐ AJOUTÉ
            "a_lettre_motivation": a_lettre  # ⭐ AJOUTÉ
        }
        result.append(candidature_dict)
    
    return result


@router.get("/offre/{offre_id}", response_model=List[CandidatureResponse])
async def get_candidatures_by_offre(
    offre_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Récupérer les candidatures pour une offre spécifique"""
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre non trouvée"
        )
    
    entreprise = db.query(Entreprise).filter(Entreprise.id == offre.entreprise_id).first()
    if entreprise.utilisateur_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cette offre"
        )
    
    candidatures = db.query(Candidature).filter(Candidature.offre_id == offre_id).all()
    
    result = []
    for candidature in candidatures:
        candidat = db.query(Candidat).filter(Candidat.id == candidature.candidat_id).first()
        
        a_lettre = (
            candidat.lettre_motivation_blob is not None and 
            len(candidat.lettre_motivation_blob) > 0
        ) if candidat else False
        
        candidature_dict = {
            "id": candidature.id,
            "candidat_id": candidature.candidat_id,
            "offre_id": candidature.offre_id,
            "statut": candidature.statut,
            "date_candidature": candidature.date_candidature,
            "date_modification": candidature.date_modification,
            "date_entretien": candidature.date_entretien,
            "notes": candidature.notes,
            "candidat_nom": candidat.nom if candidat else "",
            "candidat_prenom": candidat.prenom if candidat else "",
            "offre_titre": offre.titre,
            "a_cv": candidat.a_cv if candidat else False,  # ⭐ AJOUTÉ
            "a_lettre_motivation": a_lettre  # ⭐ AJOUTÉ
        }
        result.append(candidature_dict)
    
    return result


@router.get("/{candidature_id}", response_model=CandidatureResponse)
async def get_candidature(
    candidature_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer une candidature par son ID"""
    candidature = db.query(Candidature).filter(Candidature.id == candidature_id).first()
    if not candidature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == candidature.offre_id).first()
    entreprise = db.query(Entreprise).filter(Entreprise.id == offre.entreprise_id).first()
    
    # Vérifier les droits d'accès
    if current_user.role != RoleEnum.ADMIN:
        if current_user.role == RoleEnum.ENTREPRISE:
            if entreprise.utilisateur_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Vous n'avez pas accès à cette candidature"
                )
        elif current_user.role == RoleEnum.CANDIDAT:
            if candidature.candidat_id != db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first().id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Vous n'avez pas accès à cette candidature"
                )
    
    candidat = db.query(Candidat).filter(Candidat.id == candidature.candidat_id).first()
    
    a_lettre = (
        candidat.lettre_motivation_blob is not None and 
        len(candidat.lettre_motivation_blob) > 0
    ) if candidat else False
    
    candidature_dict = {
        "id": candidature.id,
        "candidat_id": candidature.candidat_id,
        "offre_id": candidature.offre_id,
        "statut": candidature.statut,
        "date_candidature": candidature.date_candidature,
        "date_modification": candidature.date_modification,
        "date_entretien": candidature.date_entretien,
        "notes": candidature.notes,
        "candidat_nom": candidat.nom if candidat else "",
        "candidat_prenom": candidat.prenom if candidat else "",
        "offre_titre": offre.titre if offre else "",
        "a_cv": candidat.a_cv if candidat else False,  # ⭐ AJOUTÉ
        "a_lettre_motivation": a_lettre  # ⭐ AJOUTÉ
    }
    
    return candidature_dict


@router.put("/{candidature_id}", response_model=CandidatureResponse)
async def update_candidature(
    candidature_id: int,
    update_data: CandidatureUpdate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Mettre à jour le statut d'une candidature"""
    candidature = db.query(Candidature).filter(Candidature.id == candidature_id).first()
    if not candidature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == candidature.offre_id).first()
    entreprise = db.query(Entreprise).filter(Entreprise.id == offre.entreprise_id).first()
    
    if entreprise.utilisateur_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cette candidature"
        )
    
    if update_data.statut:
        candidature.statut = update_data.statut
    if update_data.date_entretien:
        candidature.date_entretien = update_data.date_entretien
    if update_data.notes is not None:
        candidature.notes = update_data.notes
    
    candidature.date_modification = datetime.now()
    db.commit()
    db.refresh(candidature)
    
    # Si le statut est ACCEPTEE, récupérer les infos du candidat
    candidat = db.query(Candidat).filter(Candidat.id == candidature.candidat_id).first()
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == candidature.offre_id).first()
    
    a_lettre = (
        candidat.lettre_motivation_blob is not None and 
        len(candidat.lettre_motivation_blob) > 0
    ) if candidat else False
    
    candidature_dict = {
        "id": candidature.id,
        "candidat_id": candidature.candidat_id,
        "offre_id": candidature.offre_id,
        "statut": candidature.statut,
        "date_candidature": candidature.date_candidature,
        "date_modification": candidature.date_modification,
        "date_entretien": candidature.date_entretien,
        "notes": candidature.notes,
        "candidat_nom": candidat.nom if candidat else "",
        "candidat_prenom": candidat.prenom if candidat else "",
        "offre_titre": offre.titre if offre else "",
        "a_cv": candidat.a_cv if candidat else False,  # ⭐ AJOUTÉ
        "a_lettre_motivation": a_lettre  # ⭐ AJOUTÉ
    }
    
    return candidature_dict


@router.post("/{candidature_id}/convertir")
async def convertir_candidat_en_employe(
    candidature_id: int,
    data: ConvertEmployeData,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Convertir un candidat accepté en employé
    
    ⭐⭐ CORRECTION: Utilisation de sync_service au lieu de ontology_service directement ⭐⭐
    """
    try:
        # 1. Vérifier la candidature
        candidature = db.query(Candidature).filter(Candidature.id == candidature_id).first()
        if not candidature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidature non trouvée"
            )
        
        if candidature.statut != StatutCandidatureEnum.ACCEPTEE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seul un candidat accepté peut être converti en employé"
            )
        
        # 2. Vérifier l'offre et l'entreprise
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == candidature.offre_id).first()
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        entreprise = db.query(Entreprise).filter(Entreprise.id == offre.entreprise_id).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entreprise non trouvée"
            )
        
        if entreprise.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à cette candidature"
            )
        
        # 3. Récupérer le candidat
        candidat = db.query(Candidat).filter(Candidat.id == candidature.candidat_id).first()
        if not candidat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidat non trouvé"
            )
        
        # 4. Vérifier si l'utilisateur a déjà un employé
        existing_employe = db.query(Employe).filter(Employe.utilisateur_id == candidat.utilisateur_id).first()
        if existing_employe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet utilisateur est déjà un employé"
            )
        
        # 5. Créer l'employé en base de données
        utilisateur = db.query(Utilisateur).filter(Utilisateur.id == candidat.utilisateur_id).first()
        
        employe = Employe(
            entreprise_id=entreprise.id,
            utilisateur_id=candidat.utilisateur_id,
            nom=candidat.nom,
            prenom=candidat.prenom,
            email=utilisateur.email if utilisateur else None,
            telephone=candidat.telephone,
            adresse=candidat.adresse,
            departement_id=data.departement_id,
            poste_id=data.poste_id,
            contrat_id=data.contrat_id,
            titre_poste=data.titre_poste,
            date_embauche=datetime.strptime(data.date_embauche, '%Y-%m-%d') if data.date_embauche else None
        )
        
        db.add(employe)
        db.flush()  # ⭐ Pour obtenir l'ID de l'employé

        # 6. Mettre à jour le statut de l'utilisateur et de la candidature
        if utilisateur:
            ancien_statut = utilisateur.statut_profil
            utilisateur.statut_profil = ProfilStatutEnum.EMPLOYE
            utilisateur.date_embauche = employe.date_embauche
            utilisateur.entreprise_actuelle_id = entreprise.id
            utilisateur.est_en_ligne = True
            db.add(utilisateur)
            
            historique = HistoriqueStatutProfil(
                utilisateur_id=utilisateur.id,
                ancien_statut=ancien_statut.value if ancien_statut else ProfilStatutEnum.CANDIDAT.value,
                nouveau_statut=ProfilStatutEnum.EMPLOYE.value
            )
            db.add(historique)

        candidature.statut = StatutCandidatureEnum.ACCEPTEE
        db.commit()
        db.refresh(employe)
        
        # ============================================
        # 7. ⭐⭐ CORRECTION: SYNC AVEC sync_service ⭐⭐
        # ============================================
        try:
            logger.info(f"🔄 Synchronisation de l'employé {employe.prenom} {employe.nom} avec l'ontologie...")
            
            # ⭐⭐ Utiliser sync_service au lieu de ontology_service directement ⭐⭐
            sync_success = sync_service.sync_employe(
                employe_id=employe.id,
                nom=employe.nom,
                prenom=employe.prenom,
                email=employe.email or f"employe_{employe.id}@example.com",
                entreprise_id=entreprise.id,
                operation="add",
                db=db
            )
            
            if sync_success:
                logger.info(f"✅ Employé {employe.prenom} {employe.nom} synchronisé avec l'ontologie")
                logger.info(f"   📍 Entreprise: {entreprise.nom} (ID: {entreprise.id})")
                
                # ⭐⭐ Transférer les compétences du candidat à l'employé ⭐⭐
                from app.models.liaisons import CandidatCompetence
                competences_candidat = db.query(CandidatCompetence).filter(
                    CandidatCompetence.candidat_id == candidat.id
                ).all()
                
                for comp in competences_candidat:
                    try:
                        # ⭐⭐ Utiliser sync_service pour les compétences ⭐⭐
                        sync_service.sync_employe_competence(
                            employe_id=employe.id,
                            competence_id=comp.competence_id,
                            niveau=comp.niveau.value if hasattr(comp.niveau, 'value') else str(comp.niveau),
                            operation="add"
                        )
                        logger.info(f"   ✅ Compétence transférée: {comp.competence_id}")
                    except Exception as e:
                        logger.warning(f"   ⚠️ Erreur transfert compétence: {e}")
            else:
                logger.warning(f"⚠️ Synchronisation OWL de l'employé a échoué")
                
        except Exception as e:
            logger.error(f"❌ Erreur synchronisation ontologie: {e}")
            # On ne bloque pas la conversion si la sync échoue
        
        # ============================================
        # 8. ⭐⭐ NOTIFICATION AUX AUTRES EMPLOYÉS ⭐⭐
        # ============================================
        try:
            # Notifier les autres employés de l'entreprise via WebSocket
            from app.api.messagerie_ws import manager
            if manager.is_user_online(utilisateur.id):
                await manager.broadcast(
                    {
                        "action": "new_employee",
                        "employe": {
                            "id": employe.id,
                            "nom": employe.nom,
                            "prenom": employe.prenom,
                            "email": employe.email,
                            "titre_poste": employe.titre_poste,
                            "entreprise_id": entreprise.id
                        }
                    },
                    {u.id for u in db.query(Utilisateur).filter(
                        Utilisateur.entreprise_actuelle_id == entreprise.id,
                        Utilisateur.est_en_ligne == True,
                        Utilisateur.id != utilisateur.id
                    ).all()}
                )
                logger.info(f"📢 Notification envoyée aux collègues de l'entreprise")
        except Exception as e:
            logger.warning(f"⚠️ Erreur notification WebSocket: {e}")
        
        return {
            "message": "Candidat converti en employé avec succès",
            "employe_id": employe.id,
            "synchronise": sync_success if 'sync_success' in locals() else False,
            "entreprise_nom": entreprise.nom,
            "utilisateur": {
                "id": utilisateur.id,
                "email": utilisateur.email,
                "role": utilisateur.role.value if hasattr(utilisateur.role, 'value') else str(utilisateur.role),
                "statut_profil": utilisateur.statut_profil.value if hasattr(utilisateur.statut_profil, 'value') else str(utilisateur.statut_profil),
                "date_embauche": utilisateur.date_embauche.isoformat() if utilisateur.date_embauche else None,
                "entreprise_actuelle_id": utilisateur.entreprise_actuelle_id
            } if utilisateur else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur lors de la conversion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la conversion: {str(e)}"
        )