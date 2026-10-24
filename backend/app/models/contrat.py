"""
Modèle Contrat
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TypeContratEnum(str, enum.Enum):
    """Types de contrats"""
    CDI = "cdi"
    CDD = "cdd"
    STAGE = "stage"
    ALTERNANCE = "alternance"


class Contrat(Base):
    """Table contrats"""
    __tablename__ = "contrats"
    
    id = Column(Integer, primary_key=True, index=True)
    type_contrat = Column(
        Enum(TypeContratEnum, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        index=True
    )
    duree_mois = Column(Integer)
    salaire = Column(Numeric(10, 2))
    description = Column(Text)
    owl_iri = Column(String(255), index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    offres = relationship("OffreEmploi", back_populates="contrat")
    
    def __repr__(self):
        return f"<Contrat {self.type_contrat}>"