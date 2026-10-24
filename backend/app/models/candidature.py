"""
Modèle Candidature
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatutCandidatureEnum(str, enum.Enum):
    """Statuts des candidatures"""
    EN_ATTENTE = "EN_ATTENTE"
    EN_COURS = "EN_COURS"
    ENTRETIEN = "ENTRETIEN"
    ACCEPTEE = "ACCEPTEE"
    REFUSEE = "REFUSEE"


class Candidature(Base):
    """Table candidatures"""
    __tablename__ = "candidatures"
    
    id = Column(Integer, primary_key=True, index=True)
    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), nullable=False, index=True)
    offre_id = Column(Integer, ForeignKey("offres_emploi.id", ondelete="CASCADE"), nullable=False, index=True)
    statut = Column(
        Enum(StatutCandidatureEnum, values_callable=lambda e: [v.value for v in e]),
        default=StatutCandidatureEnum.EN_ATTENTE,
        index=True
    )
    date_candidature = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    date_entretien = Column(DateTime(timezone=True))
    notes = Column(Text)
    owl_iri = Column(String(255), index=True)
    
    # Relations
    candidat = relationship("Candidat", back_populates="candidatures")
    offre = relationship("OffreEmploi", back_populates="candidatures")
    
    def __repr__(self):
        return f"<Candidature {self.candidat_id} - {self.offre_id} ({self.statut})>"