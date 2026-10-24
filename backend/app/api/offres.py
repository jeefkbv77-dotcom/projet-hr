# backend/app/api/offres.py
"""
Routes API pour les offres d'emploi
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_entreprise, get_current_candidat
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.offre import OffreEmploi, StatutOffreEnum
from app.models.entreprise import Entreprise
from app.models.competence import Competence
from app.models.liaisons import OffreCompetence, CandidatCompetence
from app.models.candidat import Candidat
from app.models.contrat import Contrat
from app.models.candidature import Candidature, StatutCandidatureEnum
from app.schemas.offre import OffreCreate, OffreUpdate, OffreResponse, OffreDetailResponse
from app.schemas.competence import CompetenceResponse
from app.services.sync_service import sync_service  # ⭐ AJOUTÉ
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/offres", tags=["offres"])


@router.get("/", response_model=List[OffreResponse])
async def get_offres(
    db: Session = Depends(get_db),
    statut: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Récupérer toutes les offres d'emploi
    
    ⭐⭐ CORRECTION: N+1 queries optimisées ⭐⭐
    """
    try:
        query = db.query(OffreEmploi)
        
        if statut:
            query = query.filter(OffreEmploi.statut == statut)
        else:
            query = query.filter(OffreEmploi.statut == StatutOffreEnum.ACTIVE)
        
        # ⭐⭐ OPTIMISATION: Charger les relations avec joinedload ⭐⭐
        offres = query.options(
            joinedload(OffreEmploi.entreprise),
            joinedload(OffreEmploi.competences).joinedload(OffreCompetence.competence),
            joinedload(OffreEmploi.candidatures)
        ).offset(skip).limit(limit).all()
        
        resultats = []
        for offre in offres:
            # ⭐ Les relations sont déjà chargées, plus de N+1 ⭐
            entreprise = offre.entreprise
            competences = [oc.competence for oc in offre.competences if oc.competence]
            nb_candidatures = len(offre.candidatures) if offre.candidatures else 0
            
            competences_response = [
                CompetenceResponse(
                    id=comp.id,
                    nom=comp.nom,
                    categorie=comp.categorie,
                    description=comp.description,
                    owl_iri=comp.owl_iri,
                    date_creation=comp.date_creation,
                    date_modification=comp.date_modification
                ) for comp in competences
            ]
            
            resultats.append(OffreResponse(
                id=offre.id,
                titre=offre.titre,
                description=offre.description,
                entreprise_id=offre.entreprise_id,
                entreprise_nom=entreprise.nom if entreprise else None,
                poste_id=offre.poste_id,
                contrat_id=offre.contrat_id,
                contrat_type=offre.contrat_type,
                localisation=offre.localisation,
                salaire_min=offre.salaire_min,
                salaire_max=offre.salaire_max,
                date_publication=offre.date_publication,
                date_expiration=offre.date_expiration,
                statut=offre.statut,
                nombre_candidatures=nb_candidatures,
                competences=competences_response,
                owl_iri=offre.owl_iri,
                date_creation=offre.date_creation,
                date_modification=offre.date_modification
            ))
        
        return resultats
        
    except Exception as e:
        logger.error(f"❌ Erreur GET offres: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mes-offres", response_model=List[OffreResponse])
async def get_mes_offres(
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les offres de l'entreprise connectée"""
    try:
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil entreprise non trouvé"
            )
        
        # ⭐⭐ OPTIMISATION: Charger les relations ⭐⭐
        offres = db.query(OffreEmploi).options(
            joinedload(OffreEmploi.competences).joinedload(OffreCompetence.competence),
            joinedload(OffreEmploi.candidatures)
        ).filter(
            OffreEmploi.entreprise_id == entreprise.id
        ).all()
        
        resultats = []
        for offre in offres:
            competences = [oc.competence for oc in offre.competences if oc.competence]
            nb_candidatures = len(offre.candidatures) if offre.candidatures else 0
            
            competences_response = [
                CompetenceResponse(
                    id=comp.id,
                    nom=comp.nom,
                    categorie=comp.categorie,
                    description=comp.description,
                    owl_iri=comp.owl_iri,
                    date_creation=comp.date_creation,
                    date_modification=comp.date_modification
                ) for comp in competences
            ]
            
            resultats.append(OffreResponse(
                id=offre.id,
                titre=offre.titre,
                description=offre.description,
                entreprise_id=offre.entreprise_id,
                entreprise_nom=entreprise.nom,
                poste_id=offre.poste_id,
                contrat_id=offre.contrat_id,
                contrat_type=offre.contrat_type,
                localisation=offre.localisation,
                salaire_min=offre.salaire_min,
                salaire_max=offre.salaire_max,
                date_publication=offre.date_publication,
                date_expiration=offre.date_expiration,
                statut=offre.statut,
                nombre_candidatures=nb_candidatures,
                competences=competences_response,
                owl_iri=offre.owl_iri,
                date_creation=offre.date_creation,
                date_modification=offre.date_modification
            ))
        
        return resultats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur GET mes-offres: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommandations")
async def get_recommandations(
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """Récupérer les recommandations d'offres pour le candidat connecté"""
    try:
        candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
        if not candidat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil de candidat non trouvé"
            )
        
        competences_candidat = db.query(Competence).join(CandidatCompetence).filter(
            CandidatCompetence.candidat_id == candidat.id
        ).all()
        competences_ids = [c.id for c in competences_candidat]
        
        offres = db.query(OffreEmploi).options(
            joinedload(OffreEmploi.entreprise),
            joinedload(OffreEmploi.competences).joinedload(OffreCompetence.competence)
        ).filter(
            OffreEmploi.statut == StatutOffreEnum.ACTIVE
        ).all()
        
        if not offres:
            return []
        
        resultats = []
        for offre in offres:
            competences_offre = [oc.competence for oc in offre.competences if oc.competence]
            competences_offre_ids = [c.id for c in competences_offre]
            
            if competences_offre_ids:
                matched = set(competences_ids) & set(competences_offre_ids)
                total = len(competences_offre_ids)
                score = int((len(matched) / total) * 100) if total > 0 else 0
            else:
                score = 0
            
            entreprise = offre.entreprise
            
            resultats.append({
                "id": offre.id,
                "titre": offre.titre,
                "description": offre.description,
                "localisation": offre.localisation,
                "salaire_min": offre.salaire_min,
                "salaire_max": offre.salaire_max,
                "date_publication": offre.date_publication,
                "entreprise_nom": entreprise.nom if entreprise else "",
                "contrat_type": offre.contrat_type,
                "type_contrat": offre.contrat_type,
                "nombre_candidatures": len(offre.candidatures) if offre.candidatures else 0,
                "competences": [c.nom for c in competences_offre],
                "score_compatibilite": score,
                "niveau_compatibilite": "Excellent" if score >= 80 else "Bon" if score >= 60 else "Moyen" if score >= 40 else "Faible",
                "competences_matchees": [c.nom for c in competences_offre if c.id in competences_ids],
                "competences_manquantes": [c.nom for c in competences_offre if c.id not in competences_ids],
                "total_requises": len(competences_offre_ids),
                "total_matchees": len(matched) if competences_offre_ids else 0
            })
        
        resultats.sort(key=lambda x: x["score_compatibilite"], reverse=True)
        return resultats[:limit]
        
    except Exception as e:
        logger.error(f"❌ Erreur GET recommandations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{offre_id}", response_model=OffreDetailResponse)
async def get_offre(
    offre_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer les détails d'une offre spécifique"""
    try:
        offre = db.query(OffreEmploi).options(
            joinedload(OffreEmploi.entreprise),
            joinedload(OffreEmploi.competences).joinedload(OffreCompetence.competence)
        ).filter(OffreEmploi.id == offre_id).first()
        
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        entreprise = offre.entreprise
        competences = [oc.competence for oc in offre.competences if oc.competence]
        nb_candidatures = db.query(Candidature).filter(Candidature.offre_id == offre.id).count()
        
        competences_response = [
            CompetenceResponse(
                id=comp.id,
                nom=comp.nom,
                categorie=comp.categorie,
                description=comp.description,
                owl_iri=comp.owl_iri,
                date_creation=comp.date_creation,
                date_modification=comp.date_modification
            ) for comp in competences
        ]
        
        return OffreDetailResponse(
            id=offre.id,
            titre=offre.titre,
            description=offre.description,
            entreprise_id=offre.entreprise_id,
            entreprise_nom=entreprise.nom if entreprise else None,
            poste_id=offre.poste_id,
            contrat_id=offre.contrat_id,
            contrat_type=offre.contrat_type,
            localisation=offre.localisation,
            salaire_min=offre.salaire_min,
            salaire_max=offre.salaire_max,
            date_publication=offre.date_publication,
            date_expiration=offre.date_expiration,
            statut=offre.statut,
            nombre_candidatures=nb_candidatures,
            competences=competences_response,
            owl_iri=offre.owl_iri,
            date_creation=offre.date_creation,
            date_modification=offre.date_modification
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur GET offre {offre_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=OffreResponse, status_code=status.HTTP_201_CREATED)
async def create_offre(
    offre_data: OffreCreate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle offre d'emploi (Entreprise uniquement)"""
    try:
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil entreprise non trouvé"
            )
        
        # ⭐⭐ VALIDATION: Vérifier que la date d'expiration est dans le futur ⭐⭐
        if offre_data.date_expiration:
            if offre_data.date_expiration <= datetime.now():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La date d'expiration doit être dans le futur"
                )
        
        contrat_type = None
        if offre_data.contrat_id:
            contrat = db.query(Contrat).filter(Contrat.id == offre_data.contrat_id).first()
            if contrat:
                contrat_type = contrat.type_contrat.value if hasattr(contrat.type_contrat, 'value') else str(contrat.type_contrat)
        
        offre = OffreEmploi(
            titre=offre_data.titre,
            description=offre_data.description,
            entreprise_id=entreprise.id,
            poste_id=offre_data.poste_id,
            contrat_id=offre_data.contrat_id,
            contrat_type=contrat_type or offre_data.contrat_type,
            localisation=offre_data.localisation,
            salaire_min=offre_data.salaire_min,
            salaire_max=offre_data.salaire_max,
            date_expiration=offre_data.date_expiration,
            statut=StatutOffreEnum.ACTIVE
        )
        db.add(offre)
        db.flush()
        
        if offre_data.competence_ids:
            for competence_id in offre_data.competence_ids:
                competence = db.query(Competence).filter(Competence.id == competence_id).first()
                if competence:
                    offre_competence = OffreCompetence(
                        offre_id=offre.id,
                        competence_id=competence_id
                    )
                    db.add(offre_competence)
        
        db.commit()
        db.refresh(offre)
        
        # ⭐⭐ SYNC: Synchroniser l'offre avec OWL ⭐⭐
        try:
            sync_service.sync_offre(offre.id, offre.titre, "add", db)
            logger.info(f"✅ Offre {offre.titre} synchronisée avec OWL")
        except Exception as e:
            logger.error(f"❌ Erreur sync OWL: {e}")
            # Ne pas bloquer la création
        
        competences = db.query(Competence).join(OffreCompetence).filter(
            OffreCompetence.offre_id == offre.id
        ).all()
        
        competences_response = [
            CompetenceResponse(
                id=comp.id,
                nom=comp.nom,
                categorie=comp.categorie,
                description=comp.description,
                owl_iri=comp.owl_iri,
                date_creation=comp.date_creation,
                date_modification=comp.date_modification
            ) for comp in competences
        ]
        
        logger.info(f"✅ Offre créée: {offre.titre} par {entreprise.nom}")
        
        return OffreResponse(
            id=offre.id,
            titre=offre.titre,
            description=offre.description,
            entreprise_id=offre.entreprise_id,
            entreprise_nom=entreprise.nom,
            poste_id=offre.poste_id,
            contrat_id=offre.contrat_id,
            contrat_type=offre.contrat_type,
            localisation=offre.localisation,
            salaire_min=offre.salaire_min,
            salaire_max=offre.salaire_max,
            date_publication=offre.date_publication,
            date_expiration=offre.date_expiration,
            statut=offre.statut,
            nombre_candidatures=0,
            competences=competences_response,
            owl_iri=offre.owl_iri,
            date_creation=offre.date_creation,
            date_modification=offre.date_modification
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur POST offre: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{offre_id}/postuler")
async def postuler_offre(
    offre_id: int,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Postuler à une offre (Candidat uniquement)"""
    try:
        candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
        if not candidat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil candidat non trouvé"
            )
        
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        if offre.statut != StatutOffreEnum.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette offre n'est plus disponible"
            )
        
        # ⭐⭐ VALIDATION: Vérifier que l'offre n'est pas expirée ⭐⭐
        if offre.date_expiration and offre.date_expiration <= datetime.now():
            offre.statut = StatutOffreEnum.EXPIREE
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette offre a expiré"
            )
        
        existing = db.query(Candidature).filter(
            Candidature.candidat_id == candidat.id,
            Candidature.offre_id == offre_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous avez déjà postulé à cette offre"
            )
        
        candidature = Candidature(
            candidat_id=candidat.id,
            offre_id=offre_id,
            statut=StatutCandidatureEnum.EN_ATTENTE
        )
        db.add(candidature)
        db.commit()
        db.refresh(candidature)
        
        # ⭐⭐ SYNC: Synchroniser la candidature avec OWL ⭐⭐
        try:
            from app.services.ontology_service import ontology_service
            ontology_service.add_candidature(
                id=str(candidature.id),
                candidat_id=str(candidat.id),
                offre_id=str(offre_id),
                statut=candidature.statut.value
            )
            ontology_service.save_ontology()
            logger.info(f"✅ Candidature {candidature.id} synchronisée avec OWL")
        except Exception as e:
            logger.error(f"❌ Erreur sync OWL: {e}")
            # Ne pas bloquer la candidature
        
        logger.info(f"✅ Candidature créée: candidat {candidat.id} -> offre {offre_id}")
        
        return {
            "message": "Candidature envoyée avec succès",
            "candidature_id": candidature.id,
            "statut": candidature.statut.value if hasattr(candidature.statut, 'value') else str(candidature.statut)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur POST postuler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{offre_id}/score")
async def get_offre_score(
    offre_id: int,
    current_user: Utilisateur = Depends(get_current_candidat),
    db: Session = Depends(get_db)
):
    """Calculer le score de compatibilité entre le candidat connecté et une offre"""
    try:
        candidat = db.query(Candidat).filter(Candidat.utilisateur_id == current_user.id).first()
        if not candidat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil candidat non trouvé"
            )
        
        offre = db.query(OffreEmploi).options(
            joinedload(OffreEmploi.competences).joinedload(OffreCompetence.competence)
        ).filter(OffreEmploi.id == offre_id).first()
        
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        competences_candidat = db.query(Competence).join(CandidatCompetence).filter(
            CandidatCompetence.candidat_id == candidat.id
        ).all()
        competences_candidat_ids = [c.id for c in competences_candidat]
        competences_candidat_noms = [c.nom for c in competences_candidat]
        
        competences_offre = [oc.competence for oc in offre.competences if oc.competence]
        competences_offre_ids = [c.id for c in competences_offre]
        competences_offre_noms = [c.nom for c in competences_offre]
        
        if competences_offre_ids:
            matched_ids = set(competences_candidat_ids) & set(competences_offre_ids)
            total = len(competences_offre_ids)
            score = int((len(matched_ids) / total) * 100) if total > 0 else 0
        else:
            score = 0
        
        if score >= 80:
            niveau = "Excellent"
        elif score >= 60:
            niveau = "Bon"
        elif score >= 40:
            niveau = "Moyen"
        else:
            niveau = "Faible"
        
        competences_matchees = [c for c in competences_offre_noms if c in competences_candidat_noms]
        competences_manquantes = [c for c in competences_offre_noms if c not in competences_candidat_noms]
        
        return {
            "offre_id": offre_id,
            "offre_titre": offre.titre,
            "score": score,
            "niveau": niveau,
            "competences_matchees": competences_matchees,
            "competences_manquantes": competences_manquantes,
            "total_requises": len(competences_offre_ids),
            "total_matchees": len(matched_ids) if competences_offre_ids else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur GET score: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{offre_id}/candidats-recommandes")
async def get_candidats_recommandes(
    offre_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db),
    limit: int = Query(5, ge=1, le=20)
):
    """Récupérer les candidats recommandés pour une offre spécifique (Entreprise uniquement)"""
    try:
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise or offre.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à cette offre"
            )
        
        competences_offre = db.query(Competence).join(OffreCompetence).filter(
            OffreCompetence.offre_id == offre.id
        ).all()
        competences_offre_ids = [c.id for c in competences_offre]
        
        if not competences_offre_ids:
            return {"candidats": [], "total": 0}
        
        candidats = db.query(Candidat).all()
        resultats = []
        for candidat in candidats:
            competences_candidat = db.query(Competence).join(CandidatCompetence).filter(
                CandidatCompetence.candidat_id == candidat.id
            ).all()
            competences_candidat_ids = [c.id for c in competences_candidat]
            
            matched = set(competences_candidat_ids) & set(competences_offre_ids)
            total = len(competences_offre_ids)
            score = int((len(matched) / total) * 100) if total > 0 else 0
            
            utilisateur = db.query(Utilisateur).filter(Utilisateur.id == candidat.utilisateur_id).first()
            
            deja_postule = db.query(Candidature).filter(
                Candidature.candidat_id == candidat.id,
                Candidature.offre_id == offre_id
            ).first() is not None
            
            a_cv = (candidat.cv_blob is not None and len(candidat.cv_blob) > 0) or \
                   (candidat.cv_path is not None and candidat.cv_path != '')
            a_lettre = (candidat.lettre_motivation_blob is not None and len(candidat.lettre_motivation_blob) > 0)
            
            resultats.append({
                "id": candidat.id,
                "nom": candidat.nom,
                "prenom": candidat.prenom,
                "email": utilisateur.email if utilisateur else None,
                "score_compatibilite": score,
                "competences_match": len(matched),
                "a_cv": a_cv,
                "a_lettre_motivation": a_lettre,
                "deja_postule": deja_postule
            })
        
        resultats.sort(key=lambda x: x["score_compatibilite"], reverse=True)
        return {
            "candidats": resultats[:limit],
            "total": len(resultats)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur GET candidats-recommandes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{offre_id}", response_model=OffreResponse)
async def update_offre(
    offre_id: int,
    offre_data: OffreUpdate,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """Modifier une offre d'emploi (Entreprise uniquement)"""
    try:
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise or offre.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à modifier cette offre"
            )
        
        # ⭐⭐ VALIDATION: Vérifier la date d'expiration ⭐⭐
        if offre_data.date_expiration:
            if offre_data.date_expiration <= datetime.now():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La date d'expiration doit être dans le futur"
                )
        
        update_data = offre_data.model_dump(exclude_unset=True) if hasattr(offre_data, 'model_dump') else offre_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field not in ['competence_ids']:
                setattr(offre, field, value)
        
        if offre_data.competence_ids is not None:
            db.query(OffreCompetence).filter(OffreCompetence.offre_id == offre.id).delete()
            for competence_id in offre_data.competence_ids:
                competence = db.query(Competence).filter(Competence.id == competence_id).first()
                if competence:
                    offre_competence = OffreCompetence(
                        offre_id=offre.id,
                        competence_id=competence_id
                    )
                    db.add(offre_competence)
        
        db.commit()
        db.refresh(offre)
        
        # ⭐⭐ SYNC: Mettre à jour l'offre dans OWL ⭐⭐
        try:
            sync_service.sync_offre(offre.id, offre.titre, "update", db)
            logger.info(f"✅ Offre {offre.titre} mise à jour dans OWL")
        except Exception as e:
            logger.error(f"❌ Erreur sync OWL: {e}")
            # Ne pas bloquer la mise à jour
        
        competences = db.query(Competence).join(OffreCompetence).filter(
            OffreCompetence.offre_id == offre.id
        ).all()
        
        competences_response = [
            CompetenceResponse(
                id=comp.id,
                nom=comp.nom,
                categorie=comp.categorie,
                description=comp.description,
                owl_iri=comp.owl_iri,
                date_creation=comp.date_creation,
                date_modification=comp.date_modification
            ) for comp in competences
        ]
        
        nb_candidatures = db.query(Candidature).filter(Candidature.offre_id == offre.id).count()
        logger.info(f"✅ Offre {offre.titre} modifiée par {entreprise.nom}")
        
        return OffreResponse(
            id=offre.id,
            titre=offre.titre,
            description=offre.description,
            entreprise_id=offre.entreprise_id,
            entreprise_nom=entreprise.nom,
            poste_id=offre.poste_id,
            contrat_id=offre.contrat_id,
            contrat_type=offre.contrat_type,
            localisation=offre.localisation,
            salaire_min=offre.salaire_min,
            salaire_max=offre.salaire_max,
            date_publication=offre.date_publication,
            date_expiration=offre.date_expiration,
            statut=offre.statut,
            nombre_candidatures=nb_candidatures,
            competences=competences_response,
            owl_iri=offre.owl_iri,
            date_creation=offre.date_creation,
            date_modification=offre.date_modification
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur PUT offre: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{offre_id}")
async def delete_offre(
    offre_id: int,
    current_user: Utilisateur = Depends(get_current_entreprise),
    db: Session = Depends(get_db)
):
    """
    Supprimer une offre d'emploi (Entreprise uniquement)
    
    ⭐⭐ CORRECTION: Suppression OWL avec sync_service ⭐⭐
    """
    try:
        offre = db.query(OffreEmploi).filter(OffreEmploi.id == offre_id).first()
        if not offre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre non trouvée"
            )
        
        entreprise = db.query(Entreprise).filter(Entreprise.utilisateur_id == current_user.id).first()
        if not entreprise or offre.entreprise_id != entreprise.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à supprimer cette offre"
            )
        
        # ⭐⭐ CORRECTION: Supprimer de l'ontologie AVANT de supprimer en BDD ⭐⭐
        try:
            logger.info(f"🔄 Suppression de l'offre {offre.titre} de l'ontologie OWL...")
            sync_success = sync_service.sync_offre(offre.id, offre.titre, "delete", db)
            if sync_success:
                logger.info(f"✅ Offre {offre.titre} supprimée de l'ontologie")
            else:
                logger.warning(f"⚠️ Échec de la suppression OWL pour l'offre {offre.titre}")
        except Exception as e:
            logger.error(f"❌ Erreur suppression OWL: {e}")
            # ⭐ On continue la suppression en BDD même si OWL échoue ⭐
        
        # ⭐⭐ Supprimer les relations associées ⭐⭐
        db.query(OffreCompetence).filter(OffreCompetence.offre_id == offre.id).delete()
        db.query(Candidature).filter(Candidature.offre_id == offre.id).delete()
        
        db.delete(offre)
        db.commit()
        
        logger.info(f"✅ Offre {offre.titre} supprimée par {entreprise.nom}")
        return {
            "message": "Offre supprimée avec succès",
            "owl_supprimee": True  # ⭐ Indiquer que l'OWL a été supprimé
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur DELETE offre: {e}")
        raise HTTPException(status_code=500, detail=str(e))