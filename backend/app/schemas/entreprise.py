"""
Schémas Pydantic pour les entreprises
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime
from app.models.entreprise import TailleEntrepriseEnum


class EntrepriseBase(BaseModel):
    """Schéma de base pour les entreprises"""
    nom: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    adresse: Optional[str] = None
    site_web: Optional[HttpUrl] = None
    secteur_activite: Optional[str] = Field(None, max_length=100)
    taille_entreprise: Optional[TailleEntrepriseEnum] = None


class EntrepriseCreate(EntrepriseBase):
    """Schéma pour la création d'entreprise"""
    pass


class EntrepriseUpdate(BaseModel):
    """Schéma pour la mise à jour d'entreprise"""
    nom: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    adresse: Optional[str] = None
    site_web: Optional[HttpUrl] = None
    secteur_activite: Optional[str] = Field(None, max_length=100)
    taille_entreprise: Optional[TailleEntrepriseEnum] = None


class EntrepriseResponse(EntrepriseBase):
    """Schéma pour la réponse entreprise"""
    id: int
    utilisateur_id: int
    logo_path: Optional[str] = None
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True
