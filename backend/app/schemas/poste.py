# backend/app/schemas/poste.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.poste import CategoriePosteEnum

class PosteBase(BaseModel):
    titre: str
    description: Optional[str] = None
    categorie: CategoriePosteEnum = CategoriePosteEnum.AUTRE

class PosteCreate(PosteBase):
    pass

class PosteResponse(PosteBase):
    id: int
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    class Config:
        from_attributes = True