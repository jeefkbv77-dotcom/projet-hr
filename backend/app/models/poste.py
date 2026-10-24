"""
Modèle Poste
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CategoriePosteEnum(str, enum.Enum):
    """Catégories de postes"""
    MANAGER = "manager"
    DEVELOPPEUR = "developpeur"
    COMPTABLE = "comptable"
    AUTRE = "autre"


class Poste(Base):
    """Table postes"""
    __tablename__ = "postes"
    
    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False)
    description = Column(Text)
    categorie = Column(
        Enum(CategoriePosteEnum, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        index=True
    )
    sous_categorie = Column(String(100))
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    competences = relationship("PosteCompetence", back_populates="poste", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Poste {self.titre} ({self.categorie})>"