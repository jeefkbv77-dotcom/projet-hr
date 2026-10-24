"""
Modèles de liaison (tables de relation)
"""
from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class NiveauCompetenceEnum(str, enum.Enum):
    """Niveaux de compétence - EN MAJUSCULES pour correspondre à la base"""
    DEBUTANT = "DEBUTANT"
    INTERMEDIAIRE = "INTERMEDIAIRE"
    AVANCE = "AVANCE"
    EXPERT = "EXPERT"


class CandidatCompetence(Base):
    """Table de liaison candidat-compétences"""
    __tablename__ = "candidat_competences"
    
    id = Column(Integer, primary_key=True, index=True)
    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), nullable=False, index=True)
    competence_id = Column(Integer, ForeignKey("competences.id", ondelete="CASCADE"), nullable=False, index=True)
    niveau = Column(Enum(NiveauCompetenceEnum), default=NiveauCompetenceEnum.INTERMEDIAIRE)
    date_acquisition = Column(Date)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    candidat = relationship("Candidat", back_populates="competences")
    competence = relationship("Competence", back_populates="candidats")
    
    def __repr__(self):
        return f"<CandidatCompetence {self.candidat_id} - {self.competence_id}>"


class CandidatFormation(Base):
    """Table de liaison candidat-formations"""
    __tablename__ = "candidat_formations"
    
    id = Column(Integer, primary_key=True, index=True)
    candidat_id = Column(Integer, ForeignKey("candidats.id", ondelete="CASCADE"), nullable=False, index=True)
    formation_id = Column(Integer, ForeignKey("formations.id", ondelete="CASCADE"), nullable=False, index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    candidat = relationship("Candidat", back_populates="formations")
    formation = relationship("Formation", back_populates="candidats")
    
    def __repr__(self):
        return f"<CandidatFormation {self.candidat_id} - {self.formation_id}>"


class PosteCompetence(Base):
    """Table de liaison poste-compétences"""
    __tablename__ = "poste_competences"
    
    id = Column(Integer, primary_key=True, index=True)
    poste_id = Column(Integer, ForeignKey("postes.id", ondelete="CASCADE"), nullable=False, index=True)
    competence_id = Column(Integer, ForeignKey("competences.id", ondelete="CASCADE"), nullable=False, index=True)
    obligatoire = Column(Boolean, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    poste = relationship("Poste", back_populates="competences")
    competence = relationship("Competence", back_populates="postes")
    
    def __repr__(self):
        return f"<PosteCompetence {self.poste_id} - {self.competence_id}>"


class OffreCompetence(Base):
    """Table de liaison offre-compétences"""
    __tablename__ = "offre_competences"
    
    id = Column(Integer, primary_key=True, index=True)
    offre_id = Column(Integer, ForeignKey("offres_emploi.id", ondelete="CASCADE"), nullable=False, index=True)
    competence_id = Column(Integer, ForeignKey("competences.id", ondelete="CASCADE"), nullable=False, index=True)
    obligatoire = Column(Boolean, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    offre = relationship("OffreEmploi", back_populates="competences")
    competence = relationship("Competence", back_populates="offres")
    
    def __repr__(self):
        return f"<OffreCompetence {self.offre_id} - {self.competence_id}>"