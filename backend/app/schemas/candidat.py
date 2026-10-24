# backend/app/schemas/candidat.py
"""
Schémas Pydantic pour les candidats
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from app.models.candidat import NiveauEtudeEnum, DisponibiliteEnum
from app.schemas.competence import CompetenceResponse
from app.schemas.formation import FormationResponse


class CandidatBase(BaseModel):
    """Schéma de base pour les candidats"""
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    telephone: Optional[str] = Field(None, max_length=20)
    adresse: Optional[str] = None
    niveau_etude: Optional[NiveauEtudeEnum] = None
    annees_experience: int = Field(default=0, ge=0)
    disponibilite: DisponibiliteEnum = DisponibiliteEnum.IMMEDIATE
    linkedin_url: Optional[HttpUrl] = None
    github_url: Optional[HttpUrl] = None
    portfolio_url: Optional[HttpUrl] = None
    site_web: Optional[HttpUrl] = None


class CandidatCreate(CandidatBase):
    """Schéma pour la création de candidat"""
    pass


class CandidatUpdate(BaseModel):
    """Schéma pour la mise à jour de candidat"""
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(None, min_length=1, max_length=100)
    telephone: Optional[str] = Field(None, max_length=20)
    adresse: Optional[str] = None
    niveau_etude: Optional[NiveauEtudeEnum] = None
    annees_experience: Optional[int] = Field(None, ge=0)
    disponibilite: Optional[DisponibiliteEnum] = None
    linkedin_url: Optional[HttpUrl] = None
    github_url: Optional[HttpUrl] = None
    portfolio_url: Optional[HttpUrl] = None
    site_web: Optional[HttpUrl] = None


class CandidatResponse(CandidatBase):
    """Schéma pour la réponse candidat"""
    id: int
    utilisateur_id: int
    cv_path: Optional[str] = None
    photo_type: Optional[str] = None
    cv_type: Optional[str] = None
    # ⭐ NOUVEAU - Type de la lettre de motivation
    lettre_motivation_type: Optional[str] = None
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CandidatProfilResponse(CandidatResponse):
    """Schéma pour le profil complet du candidat"""
    email: str
    competences: List[CompetenceResponse] = Field(default_factory=list)
    formations: List[FormationResponse] = Field(default_factory=list)
    nombre_candidatures: int = 0
    a_photo: bool = False  # Indique si le candidat a une photo
    a_cv: bool = False  # Indique si le candidat a un CV
    # ⭐ NOUVEAU - Indique si le candidat a une lettre de motivation
    a_lettre_motivation: bool = False
    
    class Config:
        from_attributes = True