# backend/app/core/events.py
"""
Système d'événements pour la synchronisation automatique avec l'ontologie OWL
"""
from sqlalchemy import event
import logging

logger = logging.getLogger(__name__)


def setup_sync_events():
    """Configurer les événements de synchronisation automatique avec l'ontologie OWL
    
    Les imports des modèles sont effectués à l'intérieur de la fonction afin
    d'éviter les importations circulaires lors de l'initialisation de l'application.
    """
    try:
        # Importer ici pour éviter les problèmes d'import circulaire
        from app.models.competence import Competence
        from app.models.candidat import Candidat
        from app.models.entreprise import Entreprise
        from app.models.employe import Employe
        from app.models.offre import OffreEmploi
        from app.models.liaisons import CandidatCompetence, OffreCompetence
        from app.services.sync_service import sync_service
        
        logger.info("🔄 Configuration des événements de synchronisation OWL...")

        # --- Compétences ---
        @event.listens_for(Competence, "after_insert")
        def after_competence_insert(mapper, connection, target):
            try:
                categorie_val = target.categorie.value if hasattr(target.categorie, 'value') else str(target.categorie)
                sync_service.sync_competence(target.id, target.nom, categorie_val, "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync competence insert: {e}")

        @event.listens_for(Competence, "after_update")
        def after_competence_update(mapper, connection, target):
            try:
                categorie_val = target.categorie.value if hasattr(target.categorie, 'value') else str(target.categorie)
                sync_service.sync_competence(target.id, target.nom, categorie_val, "update")
            except Exception as e:
                logger.error(f"❌ Erreur sync competence update: {e}")

        @event.listens_for(Competence, "before_delete")
        def before_competence_delete(mapper, connection, target):
            try:
                sync_service.sync_competence(target.id, target.nom, "competence", "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync competence delete: {e}")

        # --- Candidats ---
        @event.listens_for(Candidat, "after_insert")
        def after_candidat_insert(mapper, connection, target):
            try:
                sync_service.sync_candidat(target.id, f"{target.prenom} {target.nom}", "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync candidat insert: {e}")

        @event.listens_for(Candidat, "after_update")
        def after_candidat_update(mapper, connection, target):
            try:
                sync_service.sync_candidat(target.id, f"{target.prenom} {target.nom}", "update")
            except Exception as e:
                logger.error(f"❌ Erreur sync candidat update: {e}")

        @event.listens_for(Candidat, "before_delete")
        def before_candidat_delete(mapper, connection, target):
            try:
                sync_service.sync_candidat(target.id, f"{target.prenom} {target.nom}", "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync candidat delete: {e}")

        # --- Entreprises ---
        @event.listens_for(Entreprise, "after_insert")
        def after_entreprise_insert(mapper, connection, target):
            try:
                sync_service.sync_entreprise(target.id, target.nom, "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync entreprise insert: {e}")

        @event.listens_for(Entreprise, "after_update")
        def after_entreprise_update(mapper, connection, target):
            try:
                sync_service.sync_entreprise(target.id, target.nom, "update")
            except Exception as e:
                logger.error(f"❌ Erreur sync entreprise update: {e}")

        @event.listens_for(Entreprise, "before_delete")
        def before_entreprise_delete(mapper, connection, target):
            try:
                sync_service.sync_entreprise(target.id, target.nom, "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync entreprise delete: {e}")

        # --- Employés ---
        @event.listens_for(Employe, "after_insert")
        def after_employe_insert(mapper, connection, target):
            try:
                sync_service.sync_employe(target.id, f"{target.prenom} {target.nom}", "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync employe insert: {e}")

        @event.listens_for(Employe, "after_update")
        def after_employe_update(mapper, connection, target):
            try:
                sync_service.sync_employe(target.id, f"{target.prenom} {target.nom}", "update")
            except Exception as e:
                logger.error(f"❌ Erreur sync employe update: {e}")

        @event.listens_for(Employe, "before_delete")
        def before_employe_delete(mapper, connection, target):
            try:
                sync_service.sync_employe(target.id, f"{target.prenom} {target.nom}", "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync employe delete: {e}")

        # --- Offres d'emploi ---
        @event.listens_for(OffreEmploi, "after_insert")
        def after_offre_insert(mapper, connection, target):
            try:
                sync_service.sync_offre(target.id, target.titre, "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync offre insert: {e}")

        @event.listens_for(OffreEmploi, "after_update")
        def after_offre_update(mapper, connection, target):
            try:
                sync_service.sync_offre(target.id, target.titre, "update")
            except Exception as e:
                logger.error(f"❌ Erreur sync offre update: {e}")

        @event.listens_for(OffreEmploi, "before_delete")
        def before_offre_delete(mapper, connection, target):
            try:
                sync_service.sync_offre(target.id, target.titre, "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync offre delete: {e}")

        # --- Liaison Candidat - Compétence ---
        @event.listens_for(CandidatCompetence, "after_insert")
        def after_candidat_competence_insert(mapper, connection, target):
            try:
                if hasattr(target, 'competence') and target.competence:
                    sync_service.sync_candidat_competence(target.candidat_id, target.competence.nom, "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync candidat competence insert: {e}")

        @event.listens_for(CandidatCompetence, "before_delete")
        def before_candidat_competence_delete(mapper, connection, target):
            try:
                if hasattr(target, 'competence') and target.competence:
                    sync_service.sync_candidat_competence(target.candidat_id, target.competence.nom, "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync candidat competence delete: {e}")

        # --- Liaison Offre - Compétence ---
        @event.listens_for(OffreCompetence, "after_insert")
        def after_offre_competence_insert(mapper, connection, target):
            try:
                if hasattr(target, 'competence') and target.competence:
                    sync_service.sync_offre_competence(target.offre_id, target.competence.nom, "add")
            except Exception as e:
                logger.error(f"❌ Erreur sync offre competence insert: {e}")

        @event.listens_for(OffreCompetence, "before_delete")
        def before_offre_competence_delete(mapper, connection, target):
            try:
                if hasattr(target, 'competence') and target.competence:
                    sync_service.sync_offre_competence(target.offre_id, target.competence.nom, "delete")
            except Exception as e:
                logger.error(f"❌ Erreur sync offre competence delete: {e}")
                
        logger.info("✅ Événements de synchronisation OWL configurés avec succès")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la configuration des événements OWL: {e}")
        # On ne bloque pas le démarrage même s'il y a une erreur
        pass