"""
Schémas Pydantic pour les candidatures
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.candidature import StatutCandidatureEnum


class CandidatureBase(BaseModel):
    """Schéma de base pour les candidatures"""
    offre_id: int


class CandidatureCreate(CandidatureBase):
    """Schéma pour la création de candidature"""
    pass


class CandidatureUpdate(BaseModel):
    """Schéma pour la mise à jour de candidature"""
    statut: Optional[StatutCandidatureEnum] = None
    date_entretien: Optional[datetime] = None
    notes: Optional[str] = None


class CandidatureResponse(CandidatureBase):
    """Schéma pour la réponse candidature"""
    id: int
    candidat_id: int
    statut: StatutCandidatureEnum
    date_candidature: datetime
    date_modification: Optional[datetime] = None
    date_entretien: Optional[datetime] = None
    notes: Optional[str] = None
    owl_iri: Optional[str] = None
    
    class Config:
        from_attributes = True


class CandidatureDetailResponse(CandidatureResponse):
    """Schéma pour le détail d'une candidature"""
    candidat_nom: str
    candidat_prenom: str
    offre_titre: str
    entreprise_nom: str
    score_compatibilite: Optional[int] = None
