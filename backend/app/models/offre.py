# backend/app/models/offre.py
"""
Modèle Offre d'emploi
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatutOffreEnum(str, enum.Enum):
    """Statuts des offres"""
    BROUILLON = "BROUILLON"
    ACTIVE = "ACTIVE"
    COMBLEE = "COMBLEE"
    EXPIREE = "EXPIREE"


class OffreEmploi(Base):
    """Table offres d'emploi"""
    __tablename__ = "offres_emploi"
    
    id = Column(Integer, primary_key=True, index=True)
    entreprise_id = Column(Integer, ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False, index=True)
    titre = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    poste_id = Column(Integer, ForeignKey("postes.id", ondelete="CASCADE"), nullable=False, index=True)
    contrat_id = Column(Integer, ForeignKey("contrats.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ⭐ AJOUTER CETTE LIGNE - Champ manquant
    contrat_type = Column(String(50), nullable=True)  # CDI, CDD, Stage, Alternance, Freelance
    
    localisation = Column(String(255))
    salaire_min = Column(Numeric(10, 2))
    salaire_max = Column(Numeric(10, 2))
    date_publication = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    date_expiration = Column(DateTime(timezone=True))
    statut = Column(
        Enum(StatutOffreEnum, values_callable=lambda e: [v.value for v in e]),
        default=StatutOffreEnum.ACTIVE,
        index=True
    )
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    entreprise = relationship("Entreprise", back_populates="offres")
    poste = relationship("Poste")
    contrat = relationship("Contrat")
    competences = relationship("OffreCompetence", back_populates="offre", cascade="all, delete-orphan")
    candidatures = relationship("Candidature", back_populates="offre", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<OffreEmploi {self.titre} ({self.statut})>"