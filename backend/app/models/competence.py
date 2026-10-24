"""
Modèle Compétence
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CategorieCompetenceEnum(str, enum.Enum):
    """Catégories de compétences"""
    PROGRAMMATION = "programmation"
    DEVELOPPEMENT_WEB = "developpement_web"
    BASE_DE_DONNEES = "base_de_donnees"
    WEB_SEMANTIQUE = "web_semantique"
    AUTRE = "autre"


class Competence(Base):
    """Table compétences"""
    __tablename__ = "competences"
    
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), unique=True, nullable=False, index=True)
    categorie = Column(
        Enum(CategorieCompetenceEnum, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        index=True
    )
    description = Column(Text)
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    candidats = relationship("CandidatCompetence", back_populates="competence", cascade="all, delete-orphan")
    employes = relationship("EmployeCompetence", back_populates="competence", cascade="all, delete-orphan")
    postes = relationship("PosteCompetence", back_populates="competence", cascade="all, delete-orphan")
    offres = relationship("OffreCompetence", back_populates="competence", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Competence {self.nom} ({self.categorie})>"