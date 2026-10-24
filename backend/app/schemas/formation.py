"""
Schémas Pydantic pour les formations
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class FormationBase(BaseModel):
    """Schéma de base pour les formations"""
    titre: str = Field(..., min_length=1, max_length=255)
    etablissement: Optional[str] = Field(None, max_length=255)
    domaine: Optional[str] = Field(None, max_length=100)
    niveau: Optional[str] = Field(None, max_length=100)
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    description: Optional[str] = None


class FormationCreate(FormationBase):
    """Schéma pour la création de formation"""
    pass


class FormationUpdate(BaseModel):
    """Schéma pour la mise à jour de formation"""
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    etablissement: Optional[str] = Field(None, max_length=255)
    domaine: Optional[str] = Field(None, max_length=100)
    niveau: Optional[str] = Field(None, max_length=100)
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    description: Optional[str] = None


class FormationResponse(FormationBase):
    """Schéma pour la réponse formation"""
    id: int
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True
