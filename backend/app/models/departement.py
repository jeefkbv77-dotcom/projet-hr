"""
Modèle Département
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Departement(Base):
    """Table départements"""
    __tablename__ = "departements"
    
    id = Column(Integer, primary_key=True, index=True)
    entreprise_id = Column(Integer, ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False, index=True)
    nom = Column(String(100), nullable=False)
    description = Column(Text)
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    entreprise = relationship("Entreprise", back_populates="departements")
    employes = relationship("Employe", back_populates="departement")
    
    def __repr__(self):
        return f"<Departement {self.nom}>"
