# backend/app/schemas/contrat.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.contrat import TypeContratEnum

class ContratBase(BaseModel):
    type_contrat: TypeContratEnum
    description: Optional[str] = None

class ContratCreate(ContratBase):
    pass

class ContratResponse(ContratBase):
    id: int
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True