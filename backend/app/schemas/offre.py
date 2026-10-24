# backend/app/schemas/offre.py
"""
Schémas Pydantic pour les offres d'emploi
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.offre import StatutOffreEnum
from app.schemas.competence import CompetenceResponse


class OffreBase(BaseModel):
    """Schéma de base pour les offres"""
    titre: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    poste_id: int
    contrat_id: int
    contrat_type: Optional[str] = None
    localisation: Optional[str] = Field(None, max_length=255)
    salaire_min: Optional[Decimal] = Field(None, ge=0)
    salaire_max: Optional[Decimal] = Field(None, ge=0)
    date_expiration: Optional[datetime] = None

    @validator('date_expiration', pre=True)
    def parse_date(cls, v):
        """Convertir une chaîne en datetime"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            formats = [
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%Y-%m-%d',
                '%Y-%m-%dT%H:%M:%S.%fZ',
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(v, fmt)
                except ValueError:
                    continue
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except:
                raise ValueError(f"Format de date invalide: {v}")
        return v


class OffreCreate(OffreBase):
    """Schéma pour la création d'offre"""
    competence_ids: List[int] = Field(default_factory=list)
    statut: StatutOffreEnum = StatutOffreEnum.ACTIVE


class OffreUpdate(BaseModel):
    """Schéma pour la mise à jour d'offre"""
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    poste_id: Optional[int] = None
    contrat_id: Optional[int] = None
    contrat_type: Optional[str] = None
    localisation: Optional[str] = Field(None, max_length=255)
    salaire_min: Optional[Decimal] = Field(None, ge=0)
    salaire_max: Optional[Decimal] = Field(None, ge=0)
    date_expiration: Optional[datetime] = None
    statut: Optional[StatutOffreEnum] = None
    # ⭐ AJOUT - Permettre la mise à jour des compétences
    competence_ids: Optional[List[int]] = None
    
    @validator('date_expiration', pre=True)
    def parse_date(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            formats = [
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%Y-%m-%d',
                '%Y-%m-%dT%H:%M:%S.%fZ',
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(v, fmt)
                except ValueError:
                    continue
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except:
                raise ValueError(f"Format de date invalide: {v}")
        return v


class OffreResponse(BaseModel):
    """Schéma pour la réponse offre"""
    id: int
    titre: str
    description: Optional[str] = None
    entreprise_id: int
    entreprise_nom: Optional[str] = None
    poste_id: int
    contrat_id: int
    contrat_type: Optional[str] = None
    localisation: Optional[str] = None
    salaire_min: Optional[Decimal] = None
    salaire_max: Optional[Decimal] = None
    date_publication: datetime
    date_expiration: Optional[datetime] = None
    statut: StatutOffreEnum
    nombre_candidatures: int = 0
    competences: List[CompetenceResponse] = Field(default_factory=list)
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OffreDetailResponse(OffreResponse):
    """Schéma pour le détail d'une offre"""
    # ⭐ Ces champs sont déjà dans OffreResponse, on les garde pour la clarté
    entreprise_nom: str
    poste_titre: Optional[str] = None
    contrat_type: str
    competences: List[CompetenceResponse] = Field(default_factory=list)
    nombre_candidatures: int = 0
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True