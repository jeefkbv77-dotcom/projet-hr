"""
Modèle Entreprise
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import LONGBLOB  # ⭐ IMPORT DU TYPE LONGBLOB
from app.core.database import Base
import enum


class TailleEntrepriseEnum(str, enum.Enum):
    """Tailles d'entreprise"""
    STARTUP = "startup"
    PME = "pme"
    GRANDE_ENTREPRISE = "grande_entreprise"


class Entreprise(Base):
    """Table entreprises"""
    __tablename__ = "entreprises"
    
    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    nom = Column(String(255), nullable=False)
    description = Column(Text)
    
    # ⭐ Modifié en LONGBLOB pour accepter les images lourdes
    logo_blob = Column(LONGBLOB)
    logo_type = Column(String(50))
    logo_path = Column(String(255))
    
    photo_couverture_blob = Column(LONGBLOB)  # ⭐ Modifié en LONGBLOB
    photo_couverture_type = Column(String(50))
    
    adresse = Column(Text)
    site_web = Column(String(255))
    secteur_activite = Column(String(100))
    taille_entreprise = Column(
        Enum(TailleEntrepriseEnum, values_callable=lambda enum_cls: [item.value for item in enum_cls])
    )
    siret = Column(String(14))
    numero_siren = Column(String(9))
    linkedin_company_url = Column(String(255))
    twitter_url = Column(String(255))
    facebook_url = Column(String(255))
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    utilisateur = relationship(
        "Utilisateur",
        foreign_keys=[utilisateur_id],
        primaryjoin="Utilisateur.id==Entreprise.utilisateur_id",
        backref="profil_entreprise"
    )
    departements = relationship("Departement", back_populates="entreprise", cascade="all, delete-orphan")
    offres = relationship("OffreEmploi", back_populates="entreprise", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Entreprise {self.nom}>"