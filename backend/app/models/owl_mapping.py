"""
Modèle de mapping entre MySQL et OWL
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class OWLEntityMapping(Base):
    """Table de mapping entre les entités MySQL et les individus OWL"""
    __tablename__ = "owl_entity_mapping"
    
    id = Column(Integer, primary_key=True, index=True)
    type_entite = Column(String(50), nullable=False, index=True)
    mysql_id = Column(Integer, nullable=False, index=True)
    owl_iri = Column(String(255), nullable=False, unique=True, index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<OWLEntityMapping {self.type_entite}:{self.mysql_id} -> {self.owl_iri}>"
