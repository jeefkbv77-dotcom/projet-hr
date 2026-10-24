"""
Modèle Recommandation - Système de recommandations intelligentes
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TypeRecommandationEnum(str, enum.Enum):
    """Types de recommandations"""
    OFFRE_CANDIDAT = "offre_candidat"
    CANDIDAT_OFFRE = "candidat_offre"
    COMPETENCE_MANQUANTE = "competence_manquante"
    OPPORTUNITE_CARREERE = "opportunite_carriere"


class SourceRecommandationEnum(str, enum.Enum):
    """Sources de recommandations"""
    MATCHING_COMPETENCES = "matching_competences"
    IA_PREDICTIVE = "ia_predictive"
    POPULARITE = "popularite"
    MANUELLE = "manuelle"
    HYBRIDE = "hybride"


class Recommandation(Base):
    """Table recommandations"""
    __tablename__ = "recommandations"
    
    id = Column(Integer, primary_key=True, index=True)
    type_recommandation = Column(Enum(TypeRecommandationEnum), nullable=False, index=True)
    source = Column(Enum(SourceRecommandationEnum), default=SourceRecommandationEnum.MATCHING_COMPETENCES)
    
    # Références selon le type
    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), nullable=True, index=True)
    offre_id = Column(Integer, ForeignKey("offres_emploi.id", ondelete="CASCADE"), nullable=True, index=True)
    competence_id = Column(Integer, ForeignKey("competences.id", ondelete="SET NULL"), nullable=True)
    
    # Score de pertinence (0-100)
    score_pertinence = Column(Numeric(5, 2))
    
    # Détails de la recommandation
    titre = Column(String(255))
    description = Column(Text)
    raisons = Column(Text)  # JSON avec les raisons de la recommandation
    
    # Statistiques d'interaction
    vue = Column(Boolean, default=False)
    clic = Column(Boolean, default=False)
    feedback_positif = Column(Boolean, default=True)
    date_feedback = Column(DateTime(timezone=True))
    
    # Expérience
    date_expiration = Column(DateTime(timezone=True))
    est_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Recommandation {self.type_recommandation} (score: {self.score_pertinence})>"
