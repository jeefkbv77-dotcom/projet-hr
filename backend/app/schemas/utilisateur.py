# backend/app/schemas/utilisateur.py
"""
Schémas Pydantic pour les utilisateurs avec gestion robuste de l'authentification
"""
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.utilisateur import RoleEnum, ProfilStatutEnum


class UtilisateurBase(BaseModel):
    """Schéma de base pour les utilisateurs"""
    email: EmailStr
    role: Optional[RoleEnum] = None

    @field_validator('email', mode='before')
    @classmethod
    def normaliser_email(cls, v: str) -> str:
        """Nettoyer et mettre en minuscule l'adresse email"""
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator('role', mode='before')
    @classmethod
    def valider_role(cls, v):
        """Accepter les rôles en majuscules ou minuscules sans planter"""
        if isinstance(v, str):
            v_lower = v.lower()
            for role in RoleEnum:
                if role.value == v_lower or role.name.lower() == v_lower:
                    return role
        return v


class UtilisateurCreate(UtilisateurBase):
    """Schéma pour la création d'utilisateur (inscription)"""
    mot_de_passe: str = Field(..., min_length=8, description="Mot de passe d'au moins 8 caractères")


class UtilisateurLogin(BaseModel):
    """Schéma pour la connexion en JSON (React / Vue / Angular / Mobile)"""
    email: EmailStr
    mot_de_passe: str = Field(..., min_length=1)

    @field_validator('email', mode='before')
    @classmethod
    def normaliser_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UtilisateurResponse(UtilisateurBase):
    """Schéma pour la réponse utilisateur renvoyée par l'API"""
    id: int
    actif: bool
    statut_profil: Optional[ProfilStatutEnum] = None
    date_embauche: Optional[datetime] = None
    entreprise_actuelle_id: Optional[int] = None
    derniere_activite: Optional[datetime] = None
    est_en_ligne: Optional[bool] = None
    photo_profil_url: Optional[str] = None
    bio: Optional[str] = None
    date_creation: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schéma pour le token JWT renvoyé après connexion réussie"""
    access_token: str
    token_type: str = "bearer"
    role: Optional[str] = None
    utilisateur_id: Optional[int] = None


class TokenData(BaseModel):
    """Schéma pour les données extraites du token JWT"""
    email: Optional[str] = None
    role: Optional[RoleEnum] = None
    utilisateur_id: Optional[int] = None