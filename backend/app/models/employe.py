"""
Modèle Employé
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Employe(Base):
    """Table employés"""
    __tablename__ = "employes"
    
    id = Column(Integer, primary_key=True, index=True)
    entreprise_id = Column(Integer, ForeignKey("entreprises.id", ondelete="SET NULL"), nullable=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"))
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    email = Column(String(255))
    telephone = Column(String(20))
    adresse = Column(Text)
    photo_blob = Column(LargeBinary)  # Photo de profil stockée en BLOB
    photo_type = Column(String(50))   # Type MIME
    departement_id = Column(Integer, ForeignKey("departements.id", ondelete="SET NULL"), index=True)
    poste_id = Column(Integer, ForeignKey("postes.id", ondelete="SET NULL"), index=True)
    contrat_id = Column(Integer, ForeignKey("contrats.id", ondelete="SET NULL"), index=True)
    date_embauche = Column(Date)
    linkedin_url = Column(String(255))  # Profil LinkedIn
    titre_poste = Column(String(255))   # Titre du poste personnalisé
    biographie = Column(Text)           # Biographie courte
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    departement = relationship("Departement", back_populates="employes")
    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id])
    poste = relationship("Poste")
    contrat = relationship("Contrat")
    competences = relationship("EmployeCompetence", back_populates="employe", cascade="all, delete-orphan")
    formations = relationship("EmployeFormation", back_populates="employe", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Employe {self.prenom} {self.nom}>"
