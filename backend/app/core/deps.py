# backend/app/core/deps.py
"""
Dépendances FastAPI pour l'authentification et les autorisations
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Union

from app.core.database import get_db
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.candidat import Candidat
from app.models.entreprise import Entreprise

# Définition du schéma OAuth2 pour Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login/form", auto_error=False)
http_bearer_optional = HTTPBearer(auto_error=False)


def _convertir_role_en_str(role: Union[RoleEnum, str, None]) -> str:
    """Helper pour normaliser le rôle sous forme de chaîne de caractères en minuscules"""
    if role is None:
        return ""
    if hasattr(role, 'value'):
        return str(role.value).lower()
    return str(role).lower()


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Utilisateur:
    """
    Récupérer l'utilisateur actuel à partir du token JWT
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide, manquant ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception
        
    email: Optional[str] = payload.get("sub")
    if not email:
        raise credentials_exception
    
    # Récupérer l'utilisateur depuis la base de données
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == email.strip().lower()).first()
    if utilisateur is None:
        raise credentials_exception
    
    # Vérifier si l'utilisateur est actif
    if hasattr(utilisateur, 'actif') and not utilisateur.actif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compte désactivé"
        )
    
    return utilisateur


def get_current_admin(
    current_user: Utilisateur = Depends(get_current_user)
) -> Utilisateur:
    """
    Vérifier que l'utilisateur est un administrateur
    """
    user_role = _convertir_role_en_str(current_user.role)
    admin_role = _convertir_role_en_str(RoleEnum.ADMIN)
    
    if user_role != admin_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs"
        )
    return current_user


def get_current_entreprise(
    current_user: Utilisateur = Depends(get_current_user)
) -> Utilisateur:
    """
    Vérifier que l'utilisateur est une entreprise ou un admin
    """
    user_role = _convertir_role_en_str(current_user.role)
    entreprise_role = _convertir_role_en_str(RoleEnum.ENTREPRISE)
    admin_role = _convertir_role_en_str(RoleEnum.ADMIN)
    
    if user_role not in [entreprise_role, admin_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux entreprises"
        )
    return current_user


def get_current_candidat(
    current_user: Utilisateur = Depends(get_current_user)
) -> Utilisateur:
    """
    Vérifier que l'utilisateur est un candidat ou un admin
    """
    user_role = _convertir_role_en_str(current_user.role)
    candidat_role = _convertir_role_en_str(RoleEnum.CANDIDAT)
    admin_role = _convertir_role_en_str(RoleEnum.ADMIN)
    
    if user_role not in [candidat_role, admin_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux candidats"
        )
    return current_user


def get_current_candidat_profil(
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
) -> Candidat:
    """
    Récupérer le profil candidat de l'utilisateur connecté
    """
    candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
    if not candidat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil candidat non trouvé pour cet utilisateur"
        )
    return candidat


def get_current_entreprise_profil(
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
) -> Entreprise:
    """
    Récupérer le profil entreprise de l'utilisateur connecté
    """
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil entreprise non trouvé pour cet utilisateur"
        )
    return entreprise


def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_optional),
    db: Session = Depends(get_db)
) -> Optional[Utilisateur]:
    """
    Récupérer l'utilisateur si token présent, sinon None.
    Permet de ne pas bloquer les routes publiques.
    """
    if not auth or not auth.credentials:
        return None
    
    payload = decode_access_token(auth.credentials)
    if not payload:
        return None
        
    email: Optional[str] = payload.get("sub")
    if not email:
        return None
    
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == email.strip().lower()).first()
    if utilisateur and getattr(utilisateur, 'actif', True):
        return utilisateur
    return None