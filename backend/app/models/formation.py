"""
Modèle Formation
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Formation(Base):
    """Table formations"""
    __tablename__ = "formations"
    
    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False)
    etablissement = Column(String(255))
    domaine = Column(String(100))
    niveau = Column(String(100))
    date_debut = Column(Date)
    date_fin = Column(Date)
    description = Column(Text)
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    candidats = relationship("CandidatFormation", back_populates="formation", cascade="all, delete-orphan")
    employes = relationship("EmployeFormation", back_populates="formation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Formation {self.titre}>"
