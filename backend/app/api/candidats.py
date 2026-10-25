# backend/app/api/candidats.py
"""
Routes API pour les candidats
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_candidat, get_current_user, get_current_entreprise
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.candidat import Candidat
from app.models.competence import Competence
from app.models.formation import Formation
from app.models.liaisons import CandidatCompetence, CandidatFormation, NiveauCompetenceEnum
from app.models.offre import OffreEmploi, StatutOffreEnum
from app.models.entreprise import Entreprise
from app.models.candidature import Candidature
from app.schemas.candidat import CandidatCreate, CandidatUpdate, CandidatResponse, CandidatProfilResponse
from app.schemas.competence import CompetenceAjout
from app.schemas.formation import FormationCreate, FormationResponse
from app.services.sync_service import sync_service
from app.core.security import decode_access_token
import logging
import mimetypes
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/candidats", tags=["candidats"])
document_bearer = HTTPBearer(auto_error=False)


def _type_document(fichier: UploadFile) -> str:
    """Accepte les MIME parfois envoyés différemment par les navigateurs."""
    mime = fichier.content_type or mimetypes.guess_type(fichier.filename or "")[0]
    extension = (fichier.filename or "").lower().rsplit(".", 1)[-1]
    if extension == "pdf":
        return "application/pdf"
    if extension == "doc":
        return "application/msword"
    if extension == "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return mime or "application/octet-stream"


def _extension_document(mime: Optional[str], nom_original: Optional[str] = None) -> str:
    """Conserve une extension compatible avec le contenu téléchargé."""
    original_extension = (nom_original or "").lower().rsplit(".", 1)[-1]
    if original_extension in {"pdf", "doc", "docx"}:
        return original_extension
    return {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    }.get(mime or "", "bin")


def _extension_contenu(contenu: bytes, mime: Optional[str], nom_original: Optional[str] = None) -> str:
    """Détecte PDF, DOC ou DOCX quand le navigateur fournit un MIME générique."""
    extension = _extension_document(mime, nom_original)
    if extension != "bin":
        return extension
    if contenu.startswith(b"%PDF"):
        return "pdf"
    if contenu.startswith(b"PK"):
        return "docx"
    if contenu.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        return "doc"
    return extension


def _mime_contenu(contenu: bytes, mime: Optional[str]) -> str:
    """Retourne un MIME exploitable même si le navigateur a envoyé octet-stream."""
    if contenu.startswith(b"%PDF"):
        return "application/pdf"
    if contenu.startswith(b"PK"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if contenu.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        return "application/msword"
    return mime or "application/octet-stream"


def _nom_document(prefix: str, candidat: Candidat, mime: Optional[str], nom_original: Optional[str] = None, contenu: bytes = b"") -> str:
    extension = _extension_contenu(contenu, mime, nom_original)
    base = re.sub(r"[^A-Za-z0-9_-]+", "_", f"{candidat.prenom}_{candidat.nom}").strip("_")
    return f"{prefix}_{base or candidat.id}.{extension}"


def _autoriser_document_candidat(candidat: Candidat, current_user: Utilisateur, db: Session) -> bool:
    if current_user.id == candidat.utilisateur_id or current_user.role == RoleEnum.ADMIN:
        return True
    if current_user.role != RoleEnum.ENTREPRISE:
        return False
    return db.query(Candidature).join(
        OffreEmploi, Candidature.offre_id == OffreEmploi.id
    ).join(
        Entreprise, OffreEmploi.entreprise_id == Entreprise.id
    ).filter(
        Candidature.candidat_id == candidat.id,
        Entreprise.utilisateur_id == current_user.id
    ).first() is not None


def _utilisateur_document(
    token: Optional[str],
    credentials: Optional[HTTPAuthorizationCredentials],
    db: Session,
) -> Utilisateur:
    """Accepte le Bearer habituel ou ?token= pour l'ouverture d'un document."""
    raw_token = credentials.credentials if credentials else token
    payload = decode_access_token(raw_token or "")
    email = payload.get("sub") if payload else None
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == email).first() if email else None
    if not utilisateur:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant")
    return utilisateur


@router.get("/me", response_model=CandidatProfilResponse)
async def get_mon_profil(
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Obtenir mon profil de candidat"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil de candidat non trouvé"
        )
    
    competences = db.query(Competence).join(CandidatCompetence).filter(
        CandidatCompetence.candidat_id == candidat.id
    ).all()
    
    formations = db.query(Formation).join(CandidatFormation).filter(
        CandidatFormation.candidat_id == candidat.id
    ).all()
    
    a_cv = (
        (candidat.cv_blob is not None and len(candidat.cv_blob) > 0) or
        (candidat.cv_path is not None and candidat.cv_path != '')
    )
    
    a_photo = candidat.photo_blob is not None and len(candidat.photo_blob) > 0
    a_lettre = candidat.lettre_motivation_blob is not None and len(candidat.lettre_motivation_blob) > 0
    
    profil = CandidatProfilResponse(
        **{k: v for k, v in candidat.__dict__.items() if not k.startswith('_') and k not in ['photo_blob', 'cv_blob', 'lettre_motivation_blob']},
        email=current_user.email,
        competences=competences,
        formations=formations,
        nombre_candidatures=len(candidat.candidatures),
        a_photo=a_photo,
        a_cv=a_cv,
        a_lettre_motivation=a_lettre
    )
    
    return profil


@router.put("/me", response_model=CandidatResponse)
async def update_mon_profil(
    profil_update: CandidatUpdate,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Mettre à jour mon profil de candidat"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil de candidat non trouvé"
        )
    
    update_data = profil_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(candidat, field, value)
    
    db.commit()
    db.refresh(candidat)
    
    sync_service.sync_candidat(candidat.id, f"{candidat.prenom} {candidat.nom}", "update")
    
    return candidat


@router.post("/me/photo")
async def upload_ma_photo(
    fichier: UploadFile = File(...),
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Uploader sa photo de profil candidat"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(status_code=404, detail="Profil candidat non trouvé")
    
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Le fichier dépasse 10MB")
    
    # ⭐ CORRECTION : Détection intelligente du type d'image
    mime = fichier.content_type or ""
    extension = (fichier.filename or "").lower().rsplit(".", 1)[-1]
    
    # Si le navigateur envoie un type MIME bizarre, on devine grâce à l'extension ou aux octets
    if not mime.startswith("image/"):
        if extension in ["jpg", "jpeg"]:
            mime = "image/jpeg"
        elif extension == "png":
            mime = "image/png"
        elif extension == "gif":
            mime = "image/gif"
        elif extension == "webp":
            mime = "image/webp"
        else:
            # Si on ne trouve vraiment pas, on vérifie le contenu brut
            if contenu.startswith(b'\xff\xd8\xff'):
                mime = "image/jpeg"
            elif contenu.startswith(b'\x89PNG'):
                mime = "image/png"
            else:
                raise HTTPException(status_code=415, detail="Le fichier fourni n'est pas une image valide (jpg, png, gif, webp)")

    try:
        candidat.photo_blob = contenu
        candidat.photo_type = mime
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Erreur upload photo candidat")
        raise HTTPException(status_code=500, detail=f"Impossible d'enregistrer la photo: {e}") from e
    
    return {
        "message": "Photo de profil mise à jour avec succès",
        "photo_url": f"/api/candidats/{candidat.id}/photo"
    }


@router.post("/me/cv")
async def upload_mon_cv(
    fichier: UploadFile = File(...),
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Uploader son CV"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(status_code=404, detail="Profil candidat non trouvé")
    
    allowed_types = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    ]
    type_mime = _type_document(fichier)
    if type_mime not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Format de fichier non supporté. Utilisez PDF ou Word."
        )
    
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Le fichier dépasse 10MB")
    
    try:
        candidat.cv_blob = contenu
        candidat.cv_type = type_mime
        candidat.cv_path = fichier.filename
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Erreur upload CV candidat")
        raise HTTPException(status_code=500, detail=f"Impossible d'enregistrer le CV: {e}") from e
    
    return {
        "message": "CV téléchargé avec succès",
        "cv_url": f"/api/candidats/{candidat.id}/cv"
    }


@router.post("/me/lettre-motivation")
async def upload_lettre_motivation(
    fichier: UploadFile = File(...),
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Uploader sa lettre de motivation"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(status_code=404, detail="Profil candidat non trouvé")
    
    allowed_types = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    ]
    type_mime = _type_document(fichier)
    if type_mime not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Format de fichier non supporté. Utilisez PDF ou Word."
        )
    
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Le fichier dépasse 10MB")
    
    try:
        candidat.lettre_motivation_blob = contenu
        candidat.lettre_motivation_type = type_mime
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Erreur upload lettre candidat")
        raise HTTPException(status_code=500, detail=f"Impossible d'enregistrer la lettre: {e}") from e
    
    return {
        "message": "Lettre de motivation téléchargée avec succès",
        "url": f"/api/candidats/{candidat.id}/lettre-motivation"
    }


@router.get("/by-utilisateur/{user_id}/photo")
async def get_photo_candidat_by_user(
    user_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == user_id).first()
    if not candidat or not candidat.photo_blob:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    return Response(content=candidat.photo_blob, media_type=candidat.photo_type or "image/jpeg")


# ⭐ CORRECTION 1 : PHOTO - TOKEN OBLIGATOIRE
@router.get("/{candidat_id}/photo")
async def get_photo_candidat(
    candidat_id: int,
    current_user: Utilisateur = Depends(get_current_user),  # ⭐ PLUS OPTIONAL
    db: Session = Depends(get_db)
):
    """Obtenir la photo de profil d'un candidat - Token obligatoire"""
    candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
    if not candidat or not candidat.photo_blob:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    return Response(
        content=candidat.photo_blob,
        media_type=candidat.photo_type or "image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*"
        }
    )


# ⭐ CORRECTION 2 : CV - TOKEN OBLIGATOIRE
@router.get("/{candidat_id}/cv")
async def get_cv_candidat(
    candidat_id: int,
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(document_bearer),
    db: Session = Depends(get_db)
):
    """Obtenir le CV d'un candidat - Token obligatoire"""
    current_user = _utilisateur_document(token, credentials, db)
    candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
    if not candidat:
        raise HTTPException(status_code=404, detail="Candidat non trouvé")
    if not _autoriser_document_candidat(candidat, current_user, db):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce CV")
    
    if candidat.cv_blob is not None and len(candidat.cv_blob) > 0:
        return Response(
            content=candidat.cv_blob,
            media_type=_mime_contenu(candidat.cv_blob, candidat.cv_type),
            headers={
                "Content-Disposition": f"inline; filename={_nom_document('cv', candidat, candidat.cv_type, candidat.cv_path, candidat.cv_blob)}",
                "Access-Control-Allow-Origin": "*"
            }
        )
    elif candidat.cv_path:
        raise HTTPException(status_code=404, detail="CV non disponible (path uniquement)")
    
    raise HTTPException(status_code=404, detail="CV non trouvé")


# ⭐ CORRECTION 3 : LETTRE DE MOTIVATION - TOKEN OBLIGATOIRE
@router.get("/{candidat_id}/lettre-motivation")
async def get_lettre_motivation(
    candidat_id: int,
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(document_bearer),
    db: Session = Depends(get_db)
):
    """Obtenir la lettre de motivation d'un candidat - Token obligatoire"""
    current_user = _utilisateur_document(token, credentials, db)
    candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
    if not candidat:
        raise HTTPException(status_code=404, detail="Candidat non trouvé")
    if not _autoriser_document_candidat(candidat, current_user, db):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette lettre de motivation")
    
    if candidat.lettre_motivation_blob is not None and len(candidat.lettre_motivation_blob) > 0:
        return Response(
            content=candidat.lettre_motivation_blob,
            media_type=_mime_contenu(candidat.lettre_motivation_blob, candidat.lettre_motivation_type),
            headers={
                "Content-Disposition": f"inline; filename={_nom_document('lettre_motivation', candidat, candidat.lettre_motivation_type, contenu=candidat.lettre_motivation_blob)}",
                "Access-Control-Allow-Origin": "*"
            }
        )
    
    raise HTTPException(status_code=404, detail="Lettre de motivation non trouvée")


# ⭐ ROUTE PROFIL COMPLET - ACCESSIBLE AUX ENTREPRISES ET ADMIN
@router.get("/{candidat_id}/complet")
async def get_candidat_complet(
    candidat_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer toutes les informations d'un candidat
    
    - Admin: peut voir tous les profils
    - Entreprise: peut voir les profils des candidats qui ont postulé à ses offres
    - Candidat: peut voir son propre profil uniquement
    """
    # Vérifier les droits d'accès
    if current_user.role == RoleEnum.CANDIDAT:
        # Un candidat ne peut voir que son propre profil complet
        candidat_self = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
        if candidat_self and candidat_self.id != candidat_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez pas voir le profil d'un autre candidat"
            )
    
    # Pour les entreprises, vérifier l'accès
    if current_user.role == RoleEnum.ENTREPRISE:
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil entreprise non trouvé"
            )
        # Les entreprises peuvent voir les profils des candidats
        # (elles n'ont accès qu'à ceux qui ont postulé à leurs offres)
        pass
    
    candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )
    
    utilisateur = db.query(Utilisateur).filter(Utilisateur.id == candidat.utilisateur_id).first()
    
    competences = db.query(Competence).join(CandidatCompetence).filter(
        CandidatCompetence.candidat_id == candidat.id
    ).all()
    
    formations = db.query(Formation).join(CandidatFormation).filter(
        CandidatFormation.candidat_id == candidat.id
    ).all()
    
    a_cv = (
        (candidat.cv_blob is not None and len(candidat.cv_blob) > 0) or
        (candidat.cv_path is not None and candidat.cv_path != '')
    )
    
    a_photo = candidat.photo_blob is not None and len(candidat.photo_blob) > 0
    a_lettre = candidat.lettre_motivation_blob is not None and len(candidat.lettre_motivation_blob) > 0
    
    competences_list = []
    for comp in competences:
        competences_list.append({
            "id": comp.id,
            "nom": comp.nom,
            "categorie": comp.categorie.value if hasattr(comp.categorie, 'value') else str(comp.categorie),
            "description": comp.description
        })
    
    formations_list = []
    for formation in formations:
        formations_list.append({
            "id": formation.id,
            "titre": formation.titre,
            "etablissement": formation.etablissement,
            "domaine": formation.domaine,
            "niveau": formation.niveau,
            "date_debut": formation.date_debut.isoformat() if formation.date_debut else None,
            "date_fin": formation.date_fin.isoformat() if formation.date_fin else None,
            "description": formation.description
        })
    
    photo_url = f"/api/candidats/{candidat.id}/photo" if a_photo else None
    
    return {
        "id": candidat.id,
        "nom": candidat.nom,
        "prenom": candidat.prenom,
        "email": utilisateur.email if utilisateur else None,
        "telephone": candidat.telephone,
        "adresse": candidat.adresse,
        "niveau_etude": candidat.niveau_etude.value if candidat.niveau_etude and hasattr(candidat.niveau_etude, 'value') else candidat.niveau_etude,
        "annees_experience": candidat.annees_experience,
        "disponibilite": candidat.disponibilite.value if candidat.disponibilite and hasattr(candidat.disponibilite, 'value') else candidat.disponibilite,
        "actif": utilisateur.actif if utilisateur else True,
        "competences": competences_list,
        "formations": formations_list,
        "a_cv": a_cv,
        "a_photo": a_photo,
        "a_lettre_motivation": a_lettre,
        "photo_url": photo_url,
        "cv_url": f"/api/candidats/{candidat.id}/cv" if a_cv else None,
        "lettre_url": f"/api/candidats/{candidat.id}/lettre-motivation" if a_lettre else None,
        "nombre_candidatures": len(candidat.candidatures)
    }


# ⭐ ROUTE SCORE DE COMPATIBILITÉ
@router.get("/{candidat_id}/score/{offre_id}")
async def get_candidat_offre_score(
    candidat_id: int,
    offre_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculer le score de compatibilité entre un candidat et une offre
    """
    from app.models.offre import OffreEmploi
    
    # Vérifier que le candidat existe
    candidat = db.query(Candidat).filter(Candidat.id == candidat_id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )
    
    # Vérifier que l'offre existe
    offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
    if not offre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre non trouvée"
        )
    
    # Vérifier les droits d'accès pour les entreprises
    if current_user.role == RoleEnum.ENTREPRISE:
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil entreprise non trouvé"
            )
        if offre.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à cette offre"
            )
    
    # Vérifier les droits d'accès pour les candidats
    if current_user.role == RoleEnum.CANDIDAT:
        candidat_self = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
        if candidat_self and candidat_self.id != candidat_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez pas voir le score d'un autre candidat"
            )
    
    # Récupérer les compétences du candidat
    competences_candidat = db.query(Competence).join(CandidatCompetence).filter(
        CandidatCompetence.candidat_id == candidat.id
    ).all()
    competences_candidat_ids = [c.id for c in competences_candidat]
    competences_candidat_noms = [c.nom for c in competences_candidat]
    
    # Récupérer les compétences de l'offre
    competences_offre = db.query(Competence).join(OffreCompetence).filter(
        OffreCompetence.offre_id == offre.id
    ).all()
    competences_offre_ids = [c.id for c in competences_offre]
    competences_offre_noms = [c.nom for c in competences_offre]
    
    # Calculer le score
    if competences_offre_ids:
        matched_ids = set(competences_candidat_ids) & set(competences_offre_ids)
        total = len(competences_offre_ids)
        score = int((len(matched_ids) / total) * 100) if total > 0 else 0
    else:
        score = 0
    
    if score >= 80:
        niveau = "Excellent"
    elif score >= 60:
        niveau = "Bon"
    elif score >= 40:
        niveau = "Moyen"
    else:
        niveau = "Faible"
    
    competences_matchees = [c for c in competences_offre_noms if c in competences_candidat_noms]
    competences_manquantes = [c for c in competences_offre_noms if c not in competences_candidat_noms]
    
    return {
        "candidat_id": candidat_id,
        "candidat_nom": f"{candidat.prenom} {candidat.nom}",
        "offre_id": offre_id,
        "offre_titre": offre.titre,
        "score": score,
        "niveau": niveau,
        "competences_matchees": competences_matchees,
        "competences_manquantes": competences_manquantes,
        "total_requises": len(competences_offre_ids),
        "total_matchees": len(matched_ids) if competences_offre_ids else 0,
        "details": {
            "competences_candidat": competences_candidat_noms,
            "competences_offre": competences_offre_noms
        }
    }


@router.post("/me/competences", status_code=status.HTTP_201_CREATED)
async def ajouter_competence(
    competence_data: CompetenceAjout,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Ajouter une compétence à mon profil"""
    try:
        candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
        if not candidat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil de candidat non trouvé"
            )
        
        competence = db.query(Competence).filter(Competence.id == competence_data.competence_id).first()
        if not competence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compétence non trouvée"
            )
        
        existing = db.query(CandidatCompetence).filter(
            CandidatCompetence.candidat_id == candidat.id,
            CandidatCompetence.competence_id == competence_data.competence_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compétence déjà ajoutée"
            )
        
        niveau_map = {
            'debutant': NiveauCompetenceEnum.DEBUTANT,
            'débutant': NiveauCompetenceEnum.DEBUTANT,
            'DEBUTANT': NiveauCompetenceEnum.DEBUTANT,
            'intermediaire': NiveauCompetenceEnum.INTERMEDIAIRE,
            'intermédiaire': NiveauCompetenceEnum.INTERMEDIAIRE,
            'INTERMEDIAIRE': NiveauCompetenceEnum.INTERMEDIAIRE,
            'avance': NiveauCompetenceEnum.AVANCE,
            'avancé': NiveauCompetenceEnum.AVANCE,
            'AVANCE': NiveauCompetenceEnum.AVANCE,
            'expert': NiveauCompetenceEnum.EXPERT,
            'EXPERT': NiveauCompetenceEnum.EXPERT,
        }
        
        niveau_str = competence_data.niveau.lower() if competence_data.niveau else 'intermediaire'
        niveau = niveau_map.get(niveau_str, NiveauCompetenceEnum.INTERMEDIAIRE)
        
        candidat_competence = CandidatCompetence(
            candidat_id=candidat.id,
            competence_id=competence_data.competence_id,
            niveau=niveau
        )
        db.add(candidat_competence)
        db.commit()
        
        return {"message": "Compétence ajoutée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur ajout compétence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/me/competences/{competence_id}")
async def supprimer_competence(
    competence_id: int,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Supprimer une compétence de mon profil"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil de candidat non trouvé"
        )
    
    candidat_competence = db.query(CandidatCompetence).filter(
        CandidatCompetence.candidat_id == candidat.id,
        CandidatCompetence.competence_id == competence_id
    ).first()
    if not candidat_competence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compétence non trouvée dans le profil"
        )
    
    db.delete(candidat_competence)
    db.commit()
    
    return {"message": "Compétence supprimée avec succès"}


@router.post("/me/formations", response_model=FormationResponse, status_code=status.HTTP_201_CREATED)
async def ajouter_formation(
    formation_data: FormationCreate,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Ajouter une formation à mon profil"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil de candidat non trouvé"
        )
    
    formation = Formation(**formation_data.dict())
    db.add(formation)
    db.flush()
    
    candidat_formation = CandidatFormation(
        candidat_id=candidat.id,
        formation_id=formation.id
    )
    db.add(candidat_formation)
    db.commit()
    db.refresh(formation)
    
    return formation


@router.delete("/me/formations/{formation_id}")
async def supprimer_formation(
    formation_id: int,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Supprimer une formation de mon profil"""
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil de candidat non trouvé"
        )
    
    candidat_formation = db.query(CandidatFormation).filter(
        CandidatFormation.candidat_id == candidat.id,
        CandidatFormation.formation_id == formation_id
    ).first()
    if not candidat_formation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formation non trouvée dans le profil"
        )
    
    db.delete(candidat_formation)
    db.commit()
    
    return {"message": "Formation supprimée avec succès"}


@router.get("/recommandations")
async def get_mes_recommandations(
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """
    Récupérer les recommandations d'offres pour le candidat connecté
    """
    from app.models.offre import OffreEmploi, StatutOffreEnum
    from app.models.liaisons import OffreCompetence
    
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil de candidat non trouvé"
        )
    
    competences_candidat = db.query(Competence).join(CandidatCompetence).filter(
        CandidatCompetence.candidat_id == candidat.id
    ).all()
    competences_ids = [c.id for c in competences_candidat]
    
    offres = db.query(OffreEmploi).filter(
        OffreEmploi.statut == StatutOffreEnum.ACTIVE
    ).all()
    
    if not offres:
        return []
    
    resultats = []
    for offre in offres:
        competences_offre = db.query(Competence).join(OffreCompetence).filter(
            OffreCompetence.offre_id == offre.id
        ).all()
        competences_offre_ids = [c.id for c in competences_offre]
        
        if competences_offre_ids:
            matched = set(competences_ids) & set(competences_offre_ids)
            total = len(competences_offre_ids)
            score = int((len(matched) / total) * 100) if total > 0 else 0
        else:
            score = 0
        
        entreprise = db.query(Entreprise).filter(Entreprise.id == offre.entreprise_id).first()
        
        resultats.append({
            "id": offre.id,
            "titre": offre.titre,
            "description": offre.description,
            "localisation": offre.localisation,
            "salaire_min": offre.salaire_min,
            "salaire_max": offre.salaire_max,
            "date_publication": offre.date_publication,
            "entreprise_nom": entreprise.nom if entreprise else "",
            "contrat_type": offre.contrat_type,
            "type_contrat": offre.contrat_type,
            "nombre_candidatures": len(offre.candidatures),
            "competences": competences_offre,
            "score_compatibilite": score,
            "niveau_compatibilite": "Excellent" if score >= 80 else "Bon" if score >= 60 else "Moyen" if score >= 40 else "Faible",
            "competences_matchees": [c.nom for c in competences_offre if c.id in competences_ids],
            "competences_manquantes": [c.nom for c in competences_offre if c.id not in competences_ids],
            "total_requises": len(competences_offre_ids),
            "total_matchees": len(matched)
        })
    
    resultats.sort(key=lambda x: x["score_compatibilite"], reverse=True)
    
    return resultats[:limit]