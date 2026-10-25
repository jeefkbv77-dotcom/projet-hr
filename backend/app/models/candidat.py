# backend/app/models/candidat.py
"""
Modèle Candidat
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import LONGBLOB  # ⭐ IMPORTATION DU TYPE LONGBLOB
from app.core.database import Base
import enum


class NiveauEtudeEnum(str, enum.Enum):
    SANS_DIPLOME = "sans_diplome"
    BAC = "bac"
    BAC_PLUS_2 = "bac+2"
    LICENCE = "licence"
    MASTER = "master"
    DOCTORAT = "doctorat"


class DisponibiliteEnum(str, enum.Enum):
    IMMEDIATE = "immediate"
    UNE_SEMAINE = "une_semaine"
    UN_MOIS = "un_mois"
    TROIS_MOIS = "trois_mois"


class Candidat(Base):
    __tablename__ = "candidats"
    
    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    telephone = Column(String(20))
    adresse = Column(Text)
    
    # Photos (⭐ Modifié en LONGBLOB)
    photo_blob = Column(LONGBLOB)
    photo_type = Column(String(50))
    
    # CV (⭐ Modifié en LONGBLOB)
    cv_blob = Column(LONGBLOB)
    cv_type = Column(String(50))
    cv_path = Column(String(255))
    
    # Lettre de motivation (⭐ Modifié en LONGBLOB)
    lettre_motivation_blob = Column(LONGBLOB)
    lettre_motivation_type = Column(String(50))
    
    # Informations professionnelles
    niveau_etude = Column(
        Enum(NiveauEtudeEnum, values_callable=lambda e: [v.value for v in e])
    )
    annees_experience = Column(Integer, default=0)
    disponibilite = Column(
        Enum(DisponibiliteEnum, values_callable=lambda e: [v.value for v in e]),
        default=DisponibiliteEnum.IMMEDIATE
    )
    
    # Liens sociaux
    linkedin_url = Column(String(255))
    github_url = Column(String(255))
    portfolio_url = Column(String(255))
    site_web = Column(String(255))
    
    # OWL et timestamps
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id], backref="candidat")
    competences = relationship("CandidatCompetence", back_populates="candidat", cascade="all, delete-orphan")
    formations = relationship("CandidatFormation", back_populates="candidat", cascade="all, delete-orphan")
    candidatures = relationship("Candidature", back_populates="candidat", cascade="all, delete-orphan")
    
    # ⭐ PROPRIÉTÉS CALCULÉES POUR LE FRONTEND
    @property
    def a_photo(self) -> bool:
        """Indique si le candidat a une photo de profil"""
        return self.photo_blob is not None and len(self.photo_blob) > 0
    
    @property
    def a_cv(self) -> bool:
        """Indique si le candidat a un CV (BLOB ou chemin)"""
        return (self.cv_blob is not None and len(self.cv_blob) > 0) or \
               (self.cv_path is not None and self.cv_path != '')
    
    @property
    def a_lettre_motivation(self) -> bool:
        """Indique si le candidat a une lettre de motivation"""
        return self.lettre_motivation_blob is not None and len(self.lettre_motivation_blob) > 0
    
    def __repr__(self):
        return f"<Candidat {self.prenom} {self.nom}>"