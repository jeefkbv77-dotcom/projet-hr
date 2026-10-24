# backend/app/schemas/departement.py
"""
Schémas Pydantic pour les départements
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DepartementBase(BaseModel):
    """Schéma de base pour les départements"""
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class DepartementCreate(DepartementBase):
    """Schéma pour la création d'un département"""
    pass


class DepartementUpdate(BaseModel):
    """Schéma pour la mise à jour d'un département"""
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class DepartementResponse(DepartementBase):
    """Schéma pour la réponse d'un département"""
    id: int
    entreprise_id: int
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    nombre_employes: Optional[int] = 0
    
    class Config:
        from_attributes = True