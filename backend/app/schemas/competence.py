"""
Schémas Pydantic pour les compétences
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.competence import CategorieCompetenceEnum


class CompetenceBase(BaseModel):
    """Schéma de base pour les compétences"""
    nom: str = Field(..., min_length=1, max_length=100)
    categorie: CategorieCompetenceEnum
    description: Optional[str] = None


class CompetenceCreate(CompetenceBase):
    """Schéma pour la création de compétence"""
    pass


class CompetenceUpdate(BaseModel):
    """Schéma pour la mise à jour de compétence"""
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    categorie: Optional[CategorieCompetenceEnum] = None
    description: Optional[str] = None


class CompetenceResponse(CompetenceBase):
    """Schéma pour la réponse compétence"""
    id: int
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CompetenceAjout(BaseModel):
    """Schéma pour l'ajout de compétence à un candidat"""
    competence_id: int
    niveau: str = "intermediaire"
