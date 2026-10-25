# backend/app/api/fichiers.py
"""
Routes API pour la gestion des fichiers et photos
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.fichier import Fichier, TypeFichierEnum, CategorieProprietaireEnum
from app.schemas.fichier import (
    FichierResponse, PhotoResponse, CVResponse
)
import uuid
import logging
from datetime import datetime
import os
import mimetypes
from pathlib import Path
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/fichiers", tags=["fichiers"])
logger = logging.getLogger(__name__)
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


def trouver_fichier_message(nom_stockage: str) -> Path | None:
    """Retrouve un fichier malgré les anciens dossiers de lancement du backend."""
    backend_dir = Path(__file__).resolve().parents[2]
    project_dir = backend_dir.parent
    if not nom_stockage:
        return None
    candidates = [
        backend_dir / "uploads" / nom_stockage,
        project_dir / "uploads" / nom_stockage,
        Path.cwd() / "uploads" / nom_stockage,
        Path.cwd() / "backend" / "uploads" / nom_stockage,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    for root in (backend_dir, project_dir, Path.cwd()):
        if root.is_dir():
            matches = list(root.glob(f"**/uploads/{nom_stockage}"))
            if matches and matches[0].is_file():
                return matches[0]
    return None


def est_fichier_sur_disque(fichier: Fichier) -> bool:
    """Détermine si une pièce jointe possède un fichier local lisible."""
    return trouver_fichier_message(fichier.nom_stockage) is not None


def media_type_fichier(fichier: Fichier) -> str:
    """Retourne un type MIME fiable pour les médias enregistrés."""
    if fichier.type_mime and fichier.type_mime != "application/octet-stream":
        return fichier.type_mime
    return mimetypes.guess_type(fichier.nom_original or fichier.nom_stockage)[0] or "application/octet-stream"


def media_headers(disposition: str, nom_original: str) -> dict:
    """Ajoute les en-têtes nécessaires aux médias lus depuis le frontend."""
    return {
        "Content-Disposition": f'{disposition}; filename="{nom_original}"',
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "no-cache",
    }


def generer_nom_stockage(nom_original: str) -> str:
    """Générer un nom de stockage unique"""
    extension = nom_original.split('.')[-1] if '.' in nom_original else ''
    nom_unique = f"{uuid.uuid4().hex}_{int(datetime.now().timestamp())}"
    return f"{nom_unique}.{extension}" if extension else nom_unique


def valider_type_fichier(type_mime: str, type_fichier: TypeFichierEnum) -> bool:
    """Valider que le type MIME correspond au type de fichier attendu"""
    types_autorises = {
        TypeFichierEnum.PHOTO_PROFIL: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        TypeFichierEnum.LOGO: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        TypeFichierEnum.PHOTO_COUVERTURE: ['image/jpeg', 'image/png', 'image/webp'],
        TypeFichierEnum.CV: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        TypeFichierEnum.LETTRE_MOTIVATION: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        TypeFichierEnum.PORTFOLIO: ['application/pdf', 'application/zip'],
        TypeFichierEnum.CERTIFICAT: ['application/pdf', 'image/jpeg', 'image/png'],
    }
    if type_fichier == TypeFichierEnum.MESSAGE:
        return True
    return type_mime in types_autorises.get(type_fichier, [])


def convertir_categorie_proprietaire(valeur: str) -> CategorieProprietaireEnum:
    """Convertir une chaîne en CategorieProprietaireEnum"""
    if not valeur:
        return CategorieProprietaireEnum.CANDIDAT
    
    if isinstance(valeur, str):
        valeur_clean = valeur.lower().strip()
    else:
        valeur_clean = str(valeur).lower().strip()
    
    mapping = {
        'candidat': CategorieProprietaireEnum.CANDIDAT,
        'entreprise': CategorieProprietaireEnum.ENTREPRISE,
        'employe': CategorieProprietaireEnum.EMPLOYE,
        'offre': CategorieProprietaireEnum.OFFRE,
        'message': CategorieProprietaireEnum.MESSAGE,
    }
    
    if valeur_clean in mapping:
        return mapping[valeur_clean]
    
    try:
        return CategorieProprietaireEnum(valeur_clean.upper())
    except ValueError:
        return CategorieProprietaireEnum.CANDIDAT


def convertir_type_fichier(valeur: str) -> TypeFichierEnum:
    """Convertir une chaîne en TypeFichierEnum"""
    if not valeur:
        return TypeFichierEnum.AUTRE
    
    if isinstance(valeur, str):
        valeur_clean = valeur.lower().strip()
    else:
        valeur_clean = str(valeur).lower().strip()
    
    mapping = {
        'photo_profil': TypeFichierEnum.PHOTO_PROFIL,
        'logo': TypeFichierEnum.LOGO,
        'photo_couverture': TypeFichierEnum.PHOTO_COUVERTURE,
        'cv': TypeFichierEnum.CV,
        'lettre_motivation': TypeFichierEnum.LETTRE_MOTIVATION,
        'portfolio': TypeFichierEnum.PORTFOLIO,
        'certificat': TypeFichierEnum.CERTIFICAT,
        'message': TypeFichierEnum.MESSAGE,
        'autre': TypeFichierEnum.AUTRE,
    }
    
    if valeur_clean in mapping:
        return mapping[valeur_clean]
    
    try:
        return TypeFichierEnum(valeur_clean.upper())
    except ValueError:
        return TypeFichierEnum.AUTRE


@router.post("/upload", response_model=FichierResponse, status_code=status.HTTP_201_CREATED)
async def upload_fichier(
    fichier: UploadFile = File(...),
    type_fichier: str = Form(...),
    categorie_proprietaire: str = Form(...),
    proprietaire_id: int = Form(...),
    description: Optional[str] = Form(None),
    est_public: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Uploader un fichier (photo, CV, etc.)
    """
    type_enum = convertir_type_fichier(type_fichier)
    categorie_enum = convertir_categorie_proprietaire(categorie_proprietaire)
    
    print(f"📤 Upload: type={type_enum}, categorie={categorie_enum}, proprietaire={proprietaire_id}")
    
    contenu = await fichier.read()
    taille_octets = len(contenu)
    
    if type_enum == TypeFichierEnum.MESSAGE:
        if taille_octets > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Le fichier est trop volumineux (maximum 25MB pour les messages)"
            )
    else:
        if taille_octets > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Le fichier est trop volumineux (maximum 10MB)"
            )
    
    type_mime = fichier.content_type or 'application/octet-stream'
    if not valider_type_fichier(type_mime, type_enum):
        if not type_mime.startswith("image/") and type_enum in [TypeFichierEnum.PHOTO_PROFIL, TypeFichierEnum.LOGO]:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Type de fichier non supporté pour {type_enum.value}"
            )
    
    nom_stockage = generer_nom_stockage(fichier.filename or "fichier")
    
    donnees_blob = contenu if type_enum != TypeFichierEnum.MESSAGE else None
    url_stockage = None
    
    if type_enum == TypeFichierEnum.MESSAGE:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_path = UPLOAD_DIR / nom_stockage
        with open(file_path, "wb") as f:
            f.write(contenu)
        url_stockage = f"/uploads/{nom_stockage}"
    
    fichier_db = Fichier(
        nom_original=fichier.filename or "fichier",
        nom_stockage=nom_stockage,
        type_fichier=type_enum,
        categorie_proprietaire=categorie_enum,
        proprietaire_id=proprietaire_id,
        donnees_blob=donnees_blob,
        taille_octets=taille_octets,
        type_mime=type_mime,
        description=description,
        est_public=est_public,
        url_stockage=url_stockage
    )
    
    try:
        db.add(fichier_db)
        db.commit()
        db.refresh(fichier_db)
    except Exception as e:
        db.rollback()
        if type_enum == TypeFichierEnum.MESSAGE:
            file_path = UPLOAD_DIR / nom_stockage
            if file_path.is_file():
                file_path.unlink()
        logger.exception("❌ Échec insertion fichier: type=%s catégorie=%s MIME=%s", type_enum.value, categorie_enum.value, type_mime)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible d'enregistrer la pièce jointe dans la base de données"
        ) from e

    # Mettre à jour automatiquement le modèle propriétaire si nécessaire
    try:
        if categorie_enum == CategorieProprietaireEnum.CANDIDAT:
            from app.models.candidat import Candidat
            candidat = db.query(Candidat).filter(Candidat.id == proprietaire_id).first()
            if candidat:
                if type_enum == TypeFichierEnum.PHOTO_PROFIL:
                    candidat.photo_blob = contenu
                    candidat.photo_type = type_mime
                elif type_enum == TypeFichierEnum.CV:
                    candidat.cv_blob = contenu
                    candidat.cv_type = type_mime
                    candidat.cv_path = fichier_db.nom_stockage
                elif type_enum == TypeFichierEnum.LETTRE_MOTIVATION:
                    candidat.lettre_motivation_blob = contenu
                    candidat.lettre_motivation_type = type_mime
                db.add(candidat)
                db.commit()

        elif categorie_enum == CategorieProprietaireEnum.ENTREPRISE:
            from app.models.entreprise import Entreprise
            entreprise = db.query(Entreprise).filter(Entreprise.id == proprietaire_id).first()
            if entreprise:
                if type_enum == TypeFichierEnum.LOGO:
                    entreprise.logo_blob = contenu
                    entreprise.logo_type = type_mime
                    entreprise.logo_path = fichier_db.nom_stockage
                elif type_enum == TypeFichierEnum.PHOTO_COUVERTURE:
                    entreprise.photo_couverture_blob = contenu
                    entreprise.photo_couverture_type = type_mime
                db.add(entreprise)
                db.commit()

        elif categorie_enum == CategorieProprietaireEnum.EMPLOYE:
            from app.models.employe import Employe
            employe = db.query(Employe).filter(Employe.id == proprietaire_id).first()
            if employe and type_enum == TypeFichierEnum.PHOTO_PROFIL:
                employe.photo_blob = contenu
                employe.photo_type = type_mime
                db.add(employe)
                db.commit()
                
    except Exception as e:
        print(f"⚠️ Erreur mise à jour propriétaire: {e}")

    # ⭐⭐ CORRECTION: URL sans /api pour éviter le double /api ⭐⭐
    if type_enum == TypeFichierEnum.MESSAGE and url_stockage:
        file_url = url_stockage
    else:
        file_url = f"/fichiers/{fichier_db.id}/download"
    
    return {
        "id": fichier_db.id,
        "nom_original": fichier_db.nom_original,
        "nom_stockage": fichier_db.nom_stockage,
        "type_fichier": fichier_db.type_fichier.value if hasattr(fichier_db.type_fichier, 'value') else str(fichier_db.type_fichier),
        "categorie_proprietaire": fichier_db.categorie_proprietaire.value if hasattr(fichier_db.categorie_proprietaire, 'value') else str(fichier_db.categorie_proprietaire),
        "proprietaire_id": fichier_db.proprietaire_id,
        "taille_octets": fichier_db.taille_octets,
        "type_mime": fichier_db.type_mime,
        "description": fichier_db.description,
        "est_public": fichier_db.est_public,
        "est_actif": fichier_db.est_actif,
        "url_stockage": file_url,
        "nombre_telechargements": fichier_db.nombre_telechargements,
        "dernier_acces": fichier_db.dernier_acces,
        "owl_iri": fichier_db.owl_iri,
        "date_creation": fichier_db.date_creation,
        "date_modification": fichier_db.date_modification,
    }


# ⭐⭐⭐ ROUTE DE TÉLÉCHARGEMENT PUBLIQUE (SANS TOKEN) ⭐⭐⭐
@router.get("/{fichier_id}/download")
async def download_fichier(
    fichier_id: int,
    db: Session = Depends(get_db) # ⭐ SUPPRIMÉ : current_user
):
    """Télécharger le contenu d'un fichier (public)"""
    fichier = db.query(Fichier).filter(Fichier.id == fichier_id).first()
    if not fichier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier non trouvé"
        )
    
    fichier.nombre_telechargements += 1
    fichier.dernier_acces = datetime.now()
    db.commit()
    
    if fichier.donnees_blob:
        return Response(
            content=fichier.donnees_blob,
            media_type=media_type_fichier(fichier),
            headers=media_headers("attachment", fichier.nom_original)
        )
    
    if fichier.type_fichier == TypeFichierEnum.MESSAGE or est_fichier_sur_disque(fichier):
        file_path = trouver_fichier_message(fichier.nom_stockage)
        if file_path:
            return FileResponse(
                file_path,
                media_type=media_type_fichier(fichier),
                headers=media_headers("attachment", fichier.nom_original)
            )
    
    raise HTTPException(status_code=404, detail="Fichier non trouvé")


# ⭐⭐⭐ ROUTE DE VISUALISATION PUBLIQUE (SANS TOKEN) ⭐⭐⭐
@router.get("/{fichier_id}/view")
async def view_fichier(
    fichier_id: int,
    db: Session = Depends(get_db) # ⭐ SUPPRIMÉ : current_user
):
    """Voir un fichier (inline, pour les images et vidéos) - public"""
    fichier = db.query(Fichier).filter(Fichier.id == fichier_id).first()
    if not fichier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier non trouvé"
        )
    
    fichier.dernier_acces = datetime.now()
    db.commit()
    
    if fichier.donnees_blob:
        return Response(
            content=fichier.donnees_blob,
            media_type=media_type_fichier(fichier),
            headers=media_headers("inline", fichier.nom_original)
        )
    
    if fichier.type_fichier == TypeFichierEnum.MESSAGE or est_fichier_sur_disque(fichier):
        file_path = trouver_fichier_message(fichier.nom_stockage)
        if file_path:
            return FileResponse(
                file_path,
                media_type=media_type_fichier(fichier),
                headers=media_headers("inline", fichier.nom_original)
            )
    
    raise HTTPException(status_code=404, detail="Fichier non trouvé")


@router.delete("/{fichier_id}")
async def delete_fichier(
    fichier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Supprimer un fichier"""
    fichier = db.query(Fichier).filter(Fichier.id == fichier_id).first()
    if not fichier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier non trouvé"
        )
    
    if fichier.type_fichier == TypeFichierEnum.MESSAGE or est_fichier_sur_disque(fichier):
        file_path = trouver_fichier_message(fichier.nom_stockage)
        if file_path:
            os.remove(file_path)
    
    db.delete(fichier)
    db.commit()
    return {"message": "Fichier supprimé avec succès"}


@router.post("/photo-profil", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo_profil(
    fichier: UploadFile = File(...),
    categorie_proprietaire: str = Form(...),
    proprietaire_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Uploader une photo de profil"""
    return await upload_fichier(
        fichier=fichier,
        type_fichier="photo_profil",
        categorie_proprietaire=categorie_proprietaire,
        proprietaire_id=proprietaire_id,
        est_public=True,
        db=db,
        current_user=current_user
    )