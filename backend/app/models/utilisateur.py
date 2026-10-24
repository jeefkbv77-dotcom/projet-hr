"""
Modèle Utilisateur
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RoleEnum(str, enum.Enum):
    """Rôles des utilisateurs"""
    CANDIDAT = "candidat"
    ENTREPRISE = "entreprise"
    ADMIN = "admin"


class ProfilStatutEnum(str, enum.Enum):
    """Statut d'évolution du profil utilisateur"""
    CANDIDAT = "candidat"
    EMPLOYE = "employe"
    ANCIEN_EMPLOYE = "ancien_employe"


class Utilisateur(Base):
    """Table utilisateurs (base pour tous les comptes)"""
    __tablename__ = "utilisateurs"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    mot_de_passe = Column(String(255), nullable=False)
    role = Column(
        Enum(RoleEnum, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        index=True
    )
    statut_profil = Column(
        Enum(ProfilStatutEnum, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        default=ProfilStatutEnum.CANDIDAT,
        index=True
    )
    date_embauche = Column(DateTime(timezone=True), nullable=True)
    entreprise_actuelle_id = Column(Integer, ForeignKey("entreprises.id", ondelete="SET NULL"), nullable=True, index=True)
    entreprise_actuelle = relationship("Entreprise", foreign_keys=[entreprise_actuelle_id])
    derniere_activite = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    est_en_ligne = Column(Boolean, default=False)
    photo_profil_url = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    actif = Column(Boolean, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Utilisateur {self.email} ({self.role})>"


class HistoriqueStatutProfil(Base):
    """Historique des changements de statut de profil utilisateur"""
    __tablename__ = "historique_statut_profil"

    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    ancien_statut = Column(String(50), nullable=False)
    nouveau_statut = Column(String(50), nullable=False)
    date_changement = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id], backref="historique_statuts")