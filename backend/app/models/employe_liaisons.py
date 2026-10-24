"""
Modèles de liaison pour les employés
"""
from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.liaisons import NiveauCompetenceEnum


class EmployeCompetence(Base):
    """Table de liaison employé-compétences"""
    __tablename__ = "employe_competences"
    
    id = Column(Integer, primary_key=True, index=True)
    employe_id = Column(Integer, ForeignKey("employes.id", ondelete="CASCADE"), nullable=False, index=True)
    competence_id = Column(Integer, ForeignKey("competences.id", ondelete="CASCADE"), nullable=False, index=True)
    niveau = Column(Enum(NiveauCompetenceEnum), default=NiveauCompetenceEnum.INTERMEDIAIRE)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    employe = relationship("Employe", back_populates="competences")
    competence = relationship("Competence", back_populates="employes")
    
    def __repr__(self):
        return f"<EmployeCompetence {self.employe_id} - {self.competence_id}>"


class EmployeFormation(Base):
    """Table de liaison employé-formations"""
    __tablename__ = "employe_formations"
    
    id = Column(Integer, primary_key=True, index=True)
    employe_id = Column(Integer, ForeignKey("employes.id", ondelete="CASCADE"), nullable=False, index=True)
    formation_id = Column(Integer, ForeignKey("formations.id", ondelete="CASCADE"), nullable=False, index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    employe = relationship("Employe", back_populates="formations")
    formation = relationship("Formation", back_populates="employes")
    
    def __repr__(self):
        return f"<EmployeFormation {self.employe_id} - {self.formation_id}>"
