# backend/app/schemas/employe.py
"""
Schémas Pydantic pour les employés
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class EmployeBase(BaseModel):
    """Schéma de base pour les employés"""
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    telephone: Optional[str] = Field(None, max_length=20)
    adresse: Optional[str] = None
    departement_id: Optional[int] = None
    poste_id: Optional[int] = None
    contrat_id: Optional[int] = None
    date_embauche: Optional[date] = None
    titre_poste: Optional[str] = None
    biographie: Optional[str] = None


class EmployeCreate(EmployeBase):
    """Schéma pour la création d'un employé"""
    utilisateur_id: Optional[int] = None


class EmployeUpdate(BaseModel):
    """Schéma pour la mise à jour d'un employé"""
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    telephone: Optional[str] = Field(None, max_length=20)
    adresse: Optional[str] = None
    departement_id: Optional[int] = None
    poste_id: Optional[int] = None
    contrat_id: Optional[int] = None
    date_embauche: Optional[date] = None
    titre_poste: Optional[str] = None
    biographie: Optional[str] = None


class EmployeResponse(EmployeBase):
    """Schéma pour la réponse d'un employé"""
    id: int
    utilisateur_id: Optional[int] = None
    departement_nom: Optional[str] = None
    poste_titre: Optional[str] = None
    contrat_type: Optional[str] = None
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True