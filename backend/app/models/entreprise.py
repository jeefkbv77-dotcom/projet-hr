"""
Modèle Entreprise
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
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
    logo_blob = Column(LargeBinary)     # Logo stocké en BLOB
    logo_type = Column(String(50))      # Type MIME du logo
    logo_path = Column(String(255))     # Chemin du logo (alternative)
    photo_couverture_blob = Column(LargeBinary)  # Photo de couverture
    photo_couverture_type = Column(String(50))   # Type MIME de la couverture
    adresse = Column(Text)
    site_web = Column(String(255))
    secteur_activite = Column(String(100))
    taille_entreprise = Column(
        Enum(TailleEntrepriseEnum, values_callable=lambda enum_cls: [item.value for item in enum_cls])
    )
    siret = Column(String(14))          # Numéro SIRET
    numero_siren = Column(String(9))    # Numéro SIREN
    linkedin_company_url = Column(String(255))  # Page LinkedIn entreprise
    twitter_url = Column(String(255))   # Profil Twitter
    facebook_url = Column(String(255))  # Page Facebook
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    # Spécifier foreign_keys et primaryjoin pour éviter toute ambiguïté
    # Pas de backref automatique pour éviter conflits avec `entreprise_actuelle`.
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
