"""
Modèle Notification - Système de notifications
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TypeNotificationEnum(str, enum.Enum):
    """Types de notifications"""
    NOUVELLE_OFFRE = "nouvelle_offre"
    CANDIDATURE = "candidature"
    ENTRETIEN = "entretien"
    ACCEPTATION = "acceptation"
    REFUS = "refus"
    MESSAGE = "message"
    RECOMMANDATION = "recommandation"
    ALERTE_COMPETENCE = "alerte_competence"
    SYSTEME = "systeme"


class StatutNotificationEnum(str, enum.Enum):
    """Statuts des notifications"""
    NON_LUE = "non_lue"
    LUE = "lue"
    ARCHIVEE = "archivee"


class Notification(Base):
    """Table notifications"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    type_notification = Column(Enum(TypeNotificationEnum), nullable=False, index=True)
    titre = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    statut = Column(Enum(StatutNotificationEnum), default=StatutNotificationEnum.NON_LUE, index=True)
    
    # Références optionnelles
    offre_id = Column(Integer, ForeignKey("offres_emploi.id", ondelete="SET NULL"))
    candidature_id = Column(Integer, ForeignKey("candidatures.id", ondelete="SET NULL"))
    entreprise_id = Column(Integer, ForeignKey("entreprises.id", ondelete="SET NULL"))
    
    # Métadonnées
    donnees_supplementaires = Column(Text)  # JSON pour données additionnelles
    url_action = Column(String(500))  # URL vers laquelle rediriger
    
    # Timestamps
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    date_lecture = Column(DateTime(timezone=True))

    # Relation utilisateur
    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id])

    def __repr__(self):
        return f"<Notification {self.titre} ({self.type_notification})>"
