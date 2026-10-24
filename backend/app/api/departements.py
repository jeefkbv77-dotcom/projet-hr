# backend/app/api/departements.py
"""
Routes API pour les départements
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_entreprise
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.entreprise import Entreprise
from app.models.departement import Departement
from pydantic import BaseModel, field_validator
from datetime import datetime

router = APIRouter(prefix="/api/departements", tags=["departements"])

class DepartementCreate(BaseModel):
    nom: str
    description: Optional[str] = None

class DepartementResponse(BaseModel):
    id: int
    entreprise_id: int
    nom: str
    description: Optional[str] = None
    owl_iri: Optional[str] = None
    date_creation: str
    date_modification: Optional[str] = None
    
    @field_validator('date_creation', mode='before')
    @classmethod
    def convert_date_creation(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    @field_validator('date_modification', mode='before')
    @classmethod
    def convert_date_modification(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        return v
    
    class Config:
        from_attributes = True


# ⭐ CORRECTION : ACCEPTE LES DEUX URLS (avec et sans slash)
@router.get("/", response_model=List[DepartementResponse])
@router.get("", response_model=List[DepartementResponse])
async def get_departements(
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer tous les départements de l'entreprise connectée
    Supporte les deux URLs: /api/departements/ et /api/departements
    """
    try:
        print(f"🔍 Récupération des départements pour {current_user.email} (role: {current_user.role})")
        
        # ADMIN - voit tous les départements
        if current_user.role == RoleEnum.ADMIN:
            departements = db.query(Departement).all()
            print(f"📊 {len(departements)} départements trouvés (admin)")
            return departements
        
        # ENTREPRISE - voit ses propres départements
        if current_user.role == RoleEnum.ENTREPRISE:
            entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
            if not entreprise:
                print(f"⚠️ Aucune entreprise pour l'utilisateur {current_user.id}")
                return []
            
            print(f"✅ Entreprise trouvée: {entreprise.nom} (ID: {entreprise.id})")
            departements = db.query(Departement).filter(Departement.entreprise_id == entreprise.id).all()
            print(f"📊 {len(departements)} départements trouvés")
            return departements
        
        # CANDIDAT - ne voit pas les départements
        if current_user.role == RoleEnum.CANDIDAT:
            print(f"⚠️ Candidat {current_user.email} tente d'accéder aux départements")
            return []
        
        # Par défaut, retourner une liste vide
        return []
        
    except Exception as e:
        print(f"❌ Erreur GET departements: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.post("/", response_model=DepartementResponse, status_code=status.HTTP_201_CREATED)
async def create_departement(
    data: DepartementCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Créer un nouveau département (Entreprise uniquement)
    """
    try:
        print(f"📝 Création d'un département pour {current_user.email}")
        
        # Récupérer l'entreprise
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil entreprise non trouvé"
            )
        
        print(f"✅ Entreprise trouvée: {entreprise.nom} (ID: {entreprise.id})")
        
        # Vérifier si le département existe déjà
        existing = db.query(Departement).filter(
            Departement.entreprise_id == entreprise.id,
            Departement.nom == data.nom
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un département avec le nom '{data.nom}' existe déjà"
            )
        
        # Créer le département
        departement = Departement(
            entreprise_id=entreprise.id,
            nom=data.nom,
            description=data.description
        )
        
        db.add(departement)
        db.commit()
        db.refresh(departement)
        
        print(f"✅ Département créé: {departement.nom} (ID: {departement.id})")
        
        return departement
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur POST departement: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{departement_id}", response_model=DepartementResponse)
async def update_departement(
    departement_id: int,
    data: DepartementCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Mettre à jour un département (Entreprise uniquement)
    """
    try:
        departement = db.query(Departement).filter(Departement.id == departement_id).first()
        if not departement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Département non trouvé"
            )
        
        # Vérifier l'accès
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise or departement.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce département"
            )
        
        departement.nom = data.nom
        departement.description = data.description
        db.commit()
        db.refresh(departement)
        
        return departement
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur PUT departement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{departement_id}")
async def delete_departement(
    departement_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Supprimer un département (Entreprise uniquement)
    """
    try:
        departement = db.query(Departement).filter(Departement.id == departement_id).first()
        if not departement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Département non trouvé"
            )
        
        # Vérifier l'accès
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise or departement.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce département"
            )
        
        db.delete(departement)
        db.commit()
        
        return {"message": "Département supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur DELETE departement: {e}")
        raise HTTPException(status_code=500, detail=str(e))