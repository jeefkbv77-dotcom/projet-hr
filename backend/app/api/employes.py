# backend/app/api/employes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_entreprise, get_current_admin
from app.models.utilisateur import Utilisateur
from app.models.entreprise import Entreprise
from app.models.employe import Employe
from app.models.departement import Departement
from app.models.poste import Poste
from app.models.contrat import Contrat
from pydantic import BaseModel

router = APIRouter(prefix="/api/employes", tags=["employes"])

class EmployeCreate(BaseModel):
    entreprise_id: Optional[int] = None
    utilisateur_id: Optional[int] = None
    nom: str
    prenom: str
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    departement_id: Optional[int] = None
    poste_id: Optional[int] = None
    contrat_id: Optional[int] = None
    date_embauche: Optional[str] = None
    titre_poste: Optional[str] = None
    biographie: Optional[str] = None

class EmployeResponse(BaseModel):
    id: int
    entreprise_id: Optional[int] = None
    utilisateur_id: Optional[int] = None
    nom: str
    prenom: str
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    departement_id: Optional[int] = None
    poste_id: Optional[int] = None
    contrat_id: Optional[int] = None
    date_embauche: Optional[str] = None
    titre_poste: Optional[str] = None
    biographie: Optional[str] = None
    departement_nom: Optional[str] = None
    poste_titre: Optional[str] = None
    contrat_type: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[EmployeResponse])
async def get_employes(
    entreprise_id: Optional[int] = None,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Récupérer tous les employés de l'entreprise"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée"
        )
    
    query = db.query(Employe).filter(Employe.entreprise_id == entreprise.id)
    
    if entreprise_id:
        query = query.filter(Employe.entreprise_id == entreprise_id)
    
    employes = query.all()
    
    result = []
    for employe in employes:
        departement = db.query(Departement).filter(Departement.id == employe.departement_id).first()
        poste = db.query(Poste).filter(Poste.id == employe.poste_id).first()
        contrat = db.query(Contrat).filter(Contrat.id == employe.contrat_id).first()
        
        employe_dict = {
            "id": employe.id,
            "entreprise_id": employe.entreprise_id,
            "utilisateur_id": employe.utilisateur_id,
            "nom": employe.nom,
            "prenom": employe.prenom,
            "email": employe.email,
            "telephone": employe.telephone,
            "adresse": employe.adresse,
            "departement_id": employe.departement_id,
            "poste_id": employe.poste_id,
            "contrat_id": employe.contrat_id,
            "date_embauche": employe.date_embauche.isoformat() if employe.date_embauche else None,
            "titre_poste": employe.titre_poste,
            "biographie": employe.biographie,
            "departement_nom": departement.nom if departement else None,
            "poste_titre": poste.titre if poste else None,
            "contrat_type": contrat.type_contrat if contrat else None
        }
        result.append(employe_dict)
    
    return result


@router.get("/{employe_id}", response_model=EmployeResponse)
async def get_employe(
    employe_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Récupérer un employé par son ID"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée"
        )

    employe = db.query(Employe).filter(Employe.id == employe_id, Employe.entreprise_id == entreprise.id).first()
    if not employe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employé non trouvé"
        )
    
    departement = db.query(Departement).filter(Departement.id == employe.departement_id).first()
    poste = db.query(Poste).filter(Poste.id == employe.poste_id).first()
    contrat = db.query(Contrat).filter(Contrat.id == employe.contrat_id).first()
    
    return {
        "id": employe.id,
        "entreprise_id": employe.entreprise_id,
        "utilisateur_id": employe.utilisateur_id,
        "nom": employe.nom,
        "prenom": employe.prenom,
        "email": employe.email,
        "telephone": employe.telephone,
        "adresse": employe.adresse,
        "departement_id": employe.departement_id,
        "poste_id": employe.poste_id,
        "contrat_id": employe.contrat_id,
        "date_embauche": employe.date_embauche.isoformat() if employe.date_embauche else None,
        "titre_poste": employe.titre_poste,
        "biographie": employe.biographie,
        "departement_nom": departement.nom if departement else None,
        "poste_titre": poste.titre if poste else None,
        "contrat_type": contrat.type_contrat if contrat else None
    }


@router.post("/", response_model=EmployeResponse, status_code=status.HTTP_201_CREATED)
async def create_employe(
    data: EmployeCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Créer un nouvel employé"""
    entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
    if not entreprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée"
        )
    
    # Vérifier si l'utilisateur existe déjà comme employé
    if data.utilisateur_id:
        existing = db.query(Employe).filter(Employe.utilisateur_id == data.utilisateur_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet utilisateur est déjà un employé"
            )
    
    employe = Employe(
        entreprise_id=entreprise.id,
        utilisateur_id=data.utilisateur_id,
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        telephone=data.telephone,
        adresse=data.adresse,
        departement_id=data.departement_id,
        poste_id=data.poste_id,
        contrat_id=data.contrat_id,
        titre_poste=data.titre_poste,
        biographie=data.biographie
    )
    
    if data.date_embauche:
        from datetime import datetime
        employe.date_embauche = datetime.strptime(data.date_embauche, '%Y-%m-%d')
    
    db.add(employe)
    db.commit()
    db.refresh(employe)
    
    return employe


@router.put("/{employe_id}", response_model=EmployeResponse)
async def update_employe(
    employe_id: int,
    data: EmployeCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Mettre à jour un employé"""
    employe = db.query(Employe).filter(Employe.id == employe_id).first()
    if not employe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employé non trouvé"
        )
    
    # Mettre à jour les champs
    for field, value in data.dict(exclude_unset=True).items():
        if field == 'date_embauche' and value:
            from datetime import datetime
            setattr(employe, field, datetime.strptime(value, '%Y-%m-%d'))
        elif value is not None:
            setattr(employe, field, value)
    
    db.commit()
    db.refresh(employe)
    
    return employe


@router.delete("/{employe_id}")
async def delete_employe(
    employe_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Supprimer un employé"""
    employe = db.query(Employe).filter(Employe.id == employe_id).first()
    if not employe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employé non trouvé"
        )
    
    db.delete(employe)
    db.commit()
    
    return {"message": "Employé supprimé avec succès"}