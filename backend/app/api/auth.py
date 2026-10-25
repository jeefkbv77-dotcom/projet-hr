# backend/app/api/auth.py
"""
Routes API pour l'authentification
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import asyncio
import logging
import os  # ⭐ IMPORT AJOUTÉ

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.candidat import Candidat
from app.models.entreprise import Entreprise
from app.schemas.utilisateur import UtilisateurCreate, UtilisateurLogin, UtilisateurResponse, Token
from app.schemas.candidat import CandidatCreate
from app.schemas.entreprise import EntrepriseCreate
from app.services.sync_service import sync_service
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def _construire_reponse_utilisateur(utilisateur: Utilisateur) -> dict:
    """Construit une réponse détachée de SQLAlchemy pour terminer vite l'inscription."""
    role = utilisateur.role.value if hasattr(utilisateur.role, "value") else str(utilisateur.role)
    statut = getattr(utilisateur, "statut_profil", None)
    return {
        "id": utilisateur.id,
        "email": utilisateur.email,
        "role": role,
        "actif": getattr(utilisateur, "actif", True),
        "statut_profil": statut.value if hasattr(statut, "value") else statut,
        "date_embauche": utilisateur.date_embauche,
        "entreprise_actuelle_id": utilisateur.entreprise_actuelle_id,
        "derniere_activite": utilisateur.derniere_activite,
        "est_en_ligne": utilisateur.est_en_ligne,
        "photo_profil_url": utilisateur.photo_profil_url,
        "bio": utilisateur.bio,
        "date_creation": utilisateur.date_creation,
    }

class RegisterCandidatRequest(BaseModel):
    utilisateur: UtilisateurCreate
    candidat: CandidatCreate

class RegisterEntrepriseRequest(BaseModel):
    utilisateur: UtilisateurCreate
    entreprise: EntrepriseCreate

# ⭐ NOUVEAU MODÈLE POUR L'ADMIN
class AdminRegisterRequest(BaseModel):
    email: str
    mot_de_passe: str
    secret: str

router = APIRouter(prefix="/api/auth", tags=["authentification"])


def _task_sync_candidat(candidat_id: int, nom: str):
    """Tache d'arriere-plan non-bloquante pour l'ontologie OWL"""
    try:
        logger.info(f"🔄 Synchronisation OWL en arrière-plan pour le candidat {nom}...")
        sync_service.sync_candidat(
            candidat_id=candidat_id,
            nom=nom,
            operation="add"
        )
    except Exception as e:
        logger.error(f"❌ Erreur synchronisation OWL candidat (non bloquant): {e}")


def _task_sync_entreprise(entreprise_id: int, nom: str):
    """Tache d'arriere-plan non-bloquante pour l'ontologie OWL"""
    try:
        logger.info(f"🔄 Synchronisation OWL en arrière-plan pour l'entreprise {nom}...")
        sync_service.sync_entreprise(
            entreprise_id=entreprise_id,
            nom=nom,
            operation="add"
        )
    except Exception as e:
        logger.error(f"❌ Erreur synchronisation OWL entreprise (non bloquant): {e}")


def _planifier_sync(tache, *args):
    """Lance la synchronisation sans retarder la réponse HTTP d'inscription."""
    try:
        asyncio.create_task(asyncio.to_thread(tache, *args))
    except RuntimeError:
        logger.warning("⚠️ Boucle async indisponible, synchronisation ignorée")


@router.post("/register/candidat", response_model=UtilisateurResponse, status_code=status.HTTP_201_CREATED)
async def register_candidat(
    request: RegisterCandidatRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Inscription d'un nouveau candidat"""
    logger.info(f"📝 Inscription candidat: {request.utilisateur.email}")
    
    utilisateur_data = request.utilisateur
    candidat_data = request.candidat
    email_clean = utilisateur_data.email.strip().lower()
    
    existing_user = db.query(Utilisateur).filter(Utilisateur.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )
    
    try:
        utilisateur = Utilisateur(
            email=email_clean,
            mot_de_passe=get_password_hash(utilisateur_data.mot_de_passe),
            role=RoleEnum.CANDIDAT
        )
        db.add(utilisateur)
        db.flush()
        
        candidat = Candidat(
            utilisateur_id=utilisateur.id,
            nom=candidat_data.nom,
            prenom=candidat_data.prenom,
            telephone=candidat_data.telephone,
            adresse=candidat_data.adresse,
            niveau_etude=candidat_data.niveau_etude,
            annees_experience=candidat_data.annees_experience or 0,
            disponibilite=candidat_data.disponibilite or "immediate"
        )
        db.add(candidat)
        db.commit()
        db.refresh(utilisateur)
        
        # Execution asynchrone en arrière-plan pour ne jamais bloquer la réponse HTTP
        _planifier_sync(
            _task_sync_candidat,
            candidat.id,
            f"{candidat.prenom} {candidat.nom}"
        )
        
        logger.info(f"✅ Candidat créé avec succès: {utilisateur.email}")
        return _construire_reponse_utilisateur(utilisateur)
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur lors de l'inscription candidat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inscription: {str(e)}"
        )


@router.post("/register/entreprise", response_model=UtilisateurResponse, status_code=status.HTTP_201_CREATED)
async def register_entreprise(
    request: RegisterEntrepriseRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Inscription d'une nouvelle entreprise"""
    logger.info(f"📝 Inscription entreprise: {request.utilisateur.email}")
    
    utilisateur_data = request.utilisateur
    entreprise_data = request.entreprise
    email_clean = utilisateur_data.email.strip().lower()
    
    existing_user = db.query(Utilisateur).filter(Utilisateur.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )
    
    try:
        utilisateur = Utilisateur(
            email=email_clean,
            mot_de_passe=get_password_hash(utilisateur_data.mot_de_passe),
            role=RoleEnum.ENTREPRISE
        )
        db.add(utilisateur)
        db.flush()
        
        entreprise = Entreprise(
            utilisateur_id=utilisateur.id,
            nom=entreprise_data.nom,
            description=entreprise_data.description,
            adresse=entreprise_data.adresse,
            site_web=entreprise_data.site_web,
            secteur_activite=entreprise_data.secteur_activite,
            taille_entreprise=entreprise_data.taille_entreprise
        )
        db.add(entreprise)
        db.commit()
        db.refresh(utilisateur)
        
        # Execution asynchrone en arrière-plan
        _planifier_sync(
            _task_sync_entreprise,
            entreprise.id,
            entreprise.nom
        )
        
        logger.info(f"✅ Entreprise créée avec succès: {utilisateur.email}")
        return _construire_reponse_utilisateur(utilisateur)
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur lors de l'inscription entreprise: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inscription: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(
    credentials: UtilisateurLogin,
    db: Session = Depends(get_db)
):
    """Connexion d'un utilisateur via JSON (Frontend)"""
    email_clean = credentials.email.strip().lower()
    logger.info(f"🔐 Tentative de connexion (JSON): {email_clean}")
    return _effectuer_connexion(email_clean, credentials.mot_de_passe, db)


@router.post("/login/form", response_model=Token)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Connexion d'un utilisateur via Formulaire OAuth2 (Swagger UI)"""
    email_clean = form_data.username.strip().lower()
    logger.info(f"🔐 Tentative de connexion (Form Data Swagger): {email_clean}")
    return _effectuer_connexion(email_clean, form_data.password, db)


def _effectuer_connexion(email: str, mot_de_passe: str, db: Session) -> dict:
    """Vérifie les identifiants et génère un JWT sans échouer sur des valeurs de rôle ou de statut inhabituelles."""
    try:
        utilisateur = db.query(Utilisateur).filter(Utilisateur.email == email.strip().lower()).first()
    except Exception:
        logger.exception("❌ Erreur SQL pendant la recherche de l'utilisateur: %s", email)
        raise

    if not utilisateur:
        logger.warning(f"❌ Utilisateur non trouvé: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        password_valid = verify_password(mot_de_passe, utilisateur.mot_de_passe)
    except Exception:
        logger.exception("❌ Erreur pendant la vérification du mot de passe: %s", email)
        raise

    if not password_valid:
        logger.warning(f"❌ Mot de passe incorrect pour: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if hasattr(utilisateur, 'actif') and utilisateur.actif is False:
        logger.warning(f"❌ Compte désactivé: {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compte désactivé"
        )

    try:
        utilisateur.est_en_ligne = True
        utilisateur.derniere_activite = datetime.now()
        db.commit()
    except Exception as e:
        logger.warning(f"⚠️ Impossible de marquer l'utilisateur en ligne: {e}")
        db.rollback()

    try:
        role_raw = getattr(utilisateur, 'role', None)
        role_str = role_raw.value if hasattr(role_raw, 'value') else str(role_raw or 'candidat')

        expire_minutes = getattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES', 60)
        access_token = create_access_token(
            data={
                "sub": utilisateur.email,
                "role": role_str,
                "utilisateur_id": utilisateur.id,
            },
            expires_delta=timedelta(minutes=expire_minutes),
        )
    except Exception:
        logger.exception("❌ Erreur pendant la génération du token: %s", email)
        raise

    logger.info(f"✅ Connexion réussie pour {email} (Rôle: {role_str})")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_str,
        "utilisateur_id": utilisateur.id,
    }


@router.get("/me", response_model=UtilisateurResponse)
async def get_me(
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir les informations de l'utilisateur actuel sans charger des relations fragiles."""
    logger.info(f"👤 Récupération du profil: {current_user.email}")

    user_full = db.query(Utilisateur).filter(Utilisateur.id == current_user.id).first()
    if user_full is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable"
        )

    return user_full


# ⭐⭐⭐ ROUTE SECRÈTE POUR CRÉER UN ADMIN ⭐⭐⭐
@router.post("/register-admin-secret")
async def register_admin_secret(data: AdminRegisterRequest, db: Session = Depends(get_db)):
    """
    Créer un administrateur avec une clé secrète.
    Utiliser uniquement pour le premier admin ou en cas de besoin.
    """
    # 1. On vérifie que le secret fourni est le bon
    secret_attendu = os.getenv("ADMIN_REGISTRATION_SECRET")
    if not secret_attendu or data.secret != secret_attendu:
        raise HTTPException(status_code=403, detail="Clé secrète invalide")
    
    email_clean = data.email.strip().lower()
    
    # 2. On vérifie si l'email existe déjà
    existing = db.query(Utilisateur).filter(Utilisateur.email == email_clean).first()
    if existing:
        # S'il existe, on le passe juste en admin
        existing.role = RoleEnum.ADMIN
        db.commit()
        logger.info(f"✅ Utilisateur existant {email_clean} passé en admin")
        return {"message": "Utilisateur existant passé en admin", "email": email_clean}
    
    # 3. Sinon, on crée un nouvel admin
    try:
        new_admin = Utilisateur(
            email=email_clean,
            mot_de_passe=get_password_hash(data.mot_de_passe),
            role=RoleEnum.ADMIN,
            actif=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        logger.info(f"✅ Admin créé avec succès: {email_clean}")
        return {"message": "Admin créé avec succès", "email": email_clean}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur création admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))