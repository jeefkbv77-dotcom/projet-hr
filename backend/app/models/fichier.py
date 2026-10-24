"""
Modèle Fichier - Gestion des fichiers et photos
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, LargeBinary, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TypeFichierEnum(str, enum.Enum):
    """Types de fichiers"""
    PHOTO_PROFIL = "photo_profil"
    LOGO = "logo"
    PHOTO_COUVERTURE = "photo_couverture"
    CV = "cv"
    LETTRE_MOTIVATION = "lettre_motivation"
    PORTFOLIO = "portfolio"
    CERTIFICAT = "certificat"
    MESSAGE = "message"
    AUTRE = "autre"


class CategorieProprietaireEnum(str, enum.Enum):
    """Catégories de propriétaires de fichiers"""
    CANDIDAT = "candidat"
    ENTREPRISE = "entreprise"
    EMPLOYE = "employe"
    OFFRE = "offre"
    MESSAGE = "message"


class Fichier(Base):
    """Table fichiers - Stockage des fichiers et photos"""
    __tablename__ = "fichiers"
    
    id = Column(Integer, primary_key=True, index=True)
    nom_original = Column(String(255), nullable=False)
    # Reduce length to avoid MySQL index key length limits with utf8mb4
    nom_stockage = Column(String(191), unique=True, nullable=False)
    type_fichier = Column(
        Enum(TypeFichierEnum, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
        index=True,
    )
    categorie_proprietaire = Column(
        Enum(CategorieProprietaireEnum, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
        index=True,
    )
    proprietaire_id = Column(Integer, nullable=False, index=True)
    
    # Données du fichier (stockage BLOB)
    donnees_blob = Column(LargeBinary)
    taille_octets = Column(Integer)
    type_mime = Column(String(100))
    
    # Métadonnées
    description = Column(Text)
    est_public = Column(Boolean, default=False)
    est_actif = Column(Boolean, default=True)
    
    # URL alternative (si stocké sur S3 ou autre service)
    url_stockage = Column(String(500))
    
    # Statistiques
    nombre_telechargements = Column(Integer, default=0)
    dernier_acces = Column(DateTime(timezone=True))
    
    # Reduce length for indexed column to stay within MySQL index limits
    owl_iri = Column(String(191), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Fichier {self.nom_original} ({self.type_fichier})>"
