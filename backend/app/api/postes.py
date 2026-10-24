from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.poste import Poste, CategoriePosteEnum
from pydantic import BaseModel

router = APIRouter(prefix="/api/postes", tags=["postes"])

class PosteCreate(BaseModel):
    titre: str
    categorie: str = "autre"

class PosteResponse(BaseModel):
    id: int
    titre: str
    categorie: str
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[PosteResponse])
async def get_postes(db: Session = Depends(get_db)):
    try:
        postes = db.query(Poste).all()
        return postes
    except Exception as e:
        print(f"❌ Erreur GET postes: {e}")
        raise HTTPException(500, detail=str(e))

@router.post("", response_model=PosteResponse, status_code=201)
async def create_poste(data: PosteCreate, db: Session = Depends(get_db)):
    try:
        existing = db.query(Poste).filter(Poste.titre == data.titre).first()
        if existing:
            raise HTTPException(400, detail="Ce poste existe déjà")
        
        # ⭐ CONVERTIR LA CHAÎNE EN ÉNUMÉRATION
        try:
            categorie_enum = CategoriePosteEnum(data.categorie.lower())
        except ValueError:
            raise HTTPException(400, detail=f"Catégorie invalide: {data.categorie}")
        
        poste = Poste(titre=data.titre, categorie=categorie_enum)
        db.add(poste)
        db.commit()
        db.refresh(poste)
        return poste
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur POST poste: {e}")
        raise HTTPException(500, detail=str(e))

@router.delete("/{poste_id}")
async def delete_poste(poste_id: int, db: Session = Depends(get_db)):
    try:
        poste = db.query(Poste).filter(Poste.id == poste_id).first()
        if not poste:
            raise HTTPException(404, detail="Poste non trouvé")
        db.delete(poste)
        db.commit()
        return {"message": "Poste supprimé avec succès"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=str(e))