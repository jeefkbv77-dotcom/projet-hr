# backend/app/schemas/fichier.py
"""
Schémas Pydantic pour les fichiers et photos
"""
from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional
from datetime import datetime
from app.models.fichier import TypeFichierEnum, CategorieProprietaireEnum


class FichierBase(BaseModel):
    """Schéma de base pour les fichiers"""
    nom_original: str = Field(..., min_length=1, max_length=255)
    type_fichier: str  # ⭐ CHANGÉ: string au lieu de TypeFichierEnum
    categorie_proprietaire: str  # ⭐ CHANGÉ: string au lieu de CategorieProprietaireEnum
    proprietaire_id: int
    description: Optional[str] = None
    est_public: bool = False


class FichierCreate(FichierBase):
    """Schéma pour la création de fichier"""
    donnees_blob: Optional[bytes] = None
    type_mime: Optional[str] = None
    url_stockage: Optional[str] = None


class FichierUpdate(BaseModel):
    """Schéma pour la mise à jour de fichier"""
    description: Optional[str] = None
    est_public: Optional[bool] = None
    est_actif: Optional[bool] = None
    url_stockage: Optional[str] = None


class FichierResponse(FichierBase):
    """Schéma pour la réponse fichier"""
    id: int
    nom_stockage: str
    taille_octets: Optional[int] = None
    type_mime: Optional[str] = None
    est_actif: bool
    url_stockage: Optional[str] = None
    nombre_telechargements: int = 0
    dernier_acces: Optional[datetime] = None
    owl_iri: Optional[str] = None
    date_creation: datetime
    date_modification: Optional[datetime] = None
    
    # ⭐⭐ CORRECTION: Convertir les Enums en string si besoin ⭐⭐
    @field_validator('type_fichier', 'categorie_proprietaire', mode='before')
    @classmethod
    def convert_enum_to_string(cls, v):
        """Convertir un Enum en string si nécessaire"""
        if hasattr(v, 'value'):
            return v.value
        if hasattr(v, 'name'):
            return v.name
        return v
    
    class Config:
        from_attributes = True


class PhotoUpload(BaseModel):
    """Schéma pour l'upload de photo"""
    type_fichier: TypeFichierEnum
    categorie_proprietaire: CategorieProprietaireEnum
    proprietaire_id: int
    description: Optional[str] = None


class PhotoResponse(BaseModel):
    """Schéma pour la réponse photo"""
    id: int
    nom_original: str
    type_fichier: str
    type_mime: Optional[str] = None
    taille_octets: Optional[int] = None
    url_stockage: Optional[str] = None
    date_creation: datetime
    
    class Config:
        from_attributes = True


class PhotoProfilUpdate(BaseModel):
    """Schéma pour la mise à jour de photo de profil"""
    fichier_id: Optional[int] = None
    url_photo: Optional[str] = None


class CVUpload(BaseModel):
    """Schéma pour l'upload de CV"""
    categorie_proprietaire: CategorieProprietaireEnum
    proprietaire_id: int
    description: Optional[str] = None


class CVResponse(BaseModel):
    """Schéma pour la réponse CV"""
    id: int
    nom_original: str
    type_mime: Optional[str] = None
    taille_octets: Optional[int] = None
    url_stockage: Optional[str] = None
    date_creation: datetime
    
    class Config:
        from_attributes = True