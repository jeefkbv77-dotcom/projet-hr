# backend/app/services/sync_service.py
"""
Service de synchronisation automatique entre MySQL et l'ontologie OWL
"""
from app.services.ontology_service import ontology_service
from app.models.owl_mapping import OWLEntityMapping
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)


class SyncService:
    """Service pour synchroniser automatiquement les données MySQL avec l'ontologie OWL"""
    
    @staticmethod
    def sync_competence(competence_id: int, nom: str, categorie: str, operation: str = "add", db: Session = None):
        """Synchroniser une compétence avec l'ontologie"""
        try:
            # Utiliser la méthode de synchronisation de ontology_service
            ontology_service.synchronize_competence(competence_id, nom, categorie, operation)
            
            if db:
                owl_iri = f"http://smartrecruit.org/ontologie#Competence_{competence_id}"
                
                if operation in ["add", "update"]:
                    existing = db.query(OWLEntityMapping).filter_by(
                        type_entite="competence",
                        mysql_id=competence_id
                    ).first()
                    
                    if existing:
                        existing.owl_iri = owl_iri
                    else:
                        mapping = OWLEntityMapping(
                            type_entite="competence",
                            mysql_id=competence_id,
                            owl_iri=owl_iri
                        )
                        db.add(mapping)
                        
                elif operation == "delete":
                    db.query(OWLEntityMapping).filter_by(
                        type_entite="competence",
                        mysql_id=competence_id
                    ).delete()
                
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            
            logger.info(f"✅ Compétence synchronisée: {nom} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation de la compétence: {e}")
            return False

    @staticmethod
    def sync_candidat(candidat_id: int, nom: str, operation: str = "add", db: Session = None):
        """Synchroniser un candidat avec l'ontologie"""
        try:
            # Utiliser la méthode de synchronisation de ontology_service
            ontology_service.synchronize_candidat(candidat_id, nom, operation)
            
            if db:
                owl_iri = f"http://smartrecruit.org/ontologie#Candidat_{candidat_id}"
                
                if operation in ["add", "update"]:
                    existing = db.query(OWLEntityMapping).filter_by(
                        type_entite="candidat",
                        mysql_id=candidat_id
                    ).first()
                    
                    if existing:
                        existing.owl_iri = owl_iri
                    else:
                        mapping = OWLEntityMapping(
                            type_entite="candidat",
                            mysql_id=candidat_id,
                            owl_iri=owl_iri
                        )
                        db.add(mapping)
                        
                elif operation == "delete":
                    db.query(OWLEntityMapping).filter_by(
                        type_entite="candidat",
                        mysql_id=candidat_id
                    ).delete()
                
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            
            logger.info(f"✅ Candidat synchronisé: {nom} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation du candidat: {e}")
            return False

    @staticmethod
    def sync_entreprise(entreprise_id: int, nom: str, operation: str = "add", db: Session = None):
        """Synchroniser une entreprise avec l'ontologie"""
        try:
            # Utiliser la méthode de synchronisation de ontology_service
            ontology_service.synchronize_entreprise(entreprise_id, nom, operation)
            
            if db:
                owl_iri = f"http://smartrecruit.org/ontologie#Entreprise_{entreprise_id}"
                
                if operation in ["add", "update"]:
                    existing = db.query(OWLEntityMapping).filter_by(
                        type_entite="entreprise",
                        mysql_id=entreprise_id
                    ).first()
                    
                    if existing:
                        existing.owl_iri = owl_iri
                    else:
                        mapping = OWLEntityMapping(
                            type_entite="entreprise",
                            mysql_id=entreprise_id,
                            owl_iri=owl_iri
                        )
                        db.add(mapping)
                        
                elif operation == "delete":
                    db.query(OWLEntityMapping).filter_by(
                        type_entite="entreprise",
                        mysql_id=entreprise_id
                    ).delete()
                
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            
            logger.info(f"✅ Entreprise synchronisée: {nom} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation de l'entreprise: {e}")
            return False

    @staticmethod
    def sync_employe(employe_id: int, nom: str, prenom: str = "", email: str = "", 
                     entreprise_id: int = None, operation: str = "add", db: Session = None):
        """
        Synchroniser un employé avec l'ontologie
        
        Args:
            employe_id: ID de l'employé
            nom: Nom de l'employé
            prenom: Prénom de l'employé
            email: Email de l'employé
            entreprise_id: ID de l'entreprise (optionnel)
            operation: add, update, delete
            db: Session de base de données
        """
        try:
            if operation in ["add", "update"]:
                # Récupérer les informations complètes de l'employé depuis la base
                if db and entreprise_id is None:
                    # Essayer de récupérer l'entreprise depuis la base
                    from app.models.employe import Employe
                    from app.models.entreprise import Entreprise
                    
                    employe_db = db.query(Employe).filter(Employe.id == employe_id).first()
                    if employe_db:
                        # Si on a l'employé en base, utiliser ses données
                        nom = employe_db.nom or nom
                        prenom = employe_db.prenom or prenom
                        email = employe_db.email or email
                        
                        # Récupérer l'entreprise via l'utilisateur
                        if employe_db.utilisateur_id:
                            entreprise = db.query(Entreprise).filter(
                                Entreprise.utilisateur_id == employe_db.utilisateur_id
                            ).first()
                            if entreprise:
                                entreprise_id = entreprise.id
                
                # Ajouter l'employé à l'ontologie
                ontology_service.add_employe(
                    id=str(employe_id),
                    nom=nom,
                    prenom=prenom,
                    email=email or f"employe_{employe_id}@example.com",
                    entreprise_id=str(entreprise_id) if entreprise_id else None
                )
                
            elif operation == "delete":
                # Supprimer l'employé de l'ontologie
                employe_uri = ontology_service.ns[f"Employe_{employe_id}"]
                ontology_service.graph.remove((employe_uri, None, None))
            
            # Sauvegarder l'ontologie
            ontology_service.save_ontology()
            
            # Mettre à jour le mapping
            if db:
                owl_iri = f"http://smartrecruit.org/ontologie#Employe_{employe_id}"
                
                if operation in ["add", "update"]:
                    existing = db.query(OWLEntityMapping).filter_by(
                        type_entite="employe",
                        mysql_id=employe_id
                    ).first()
                    
                    if existing:
                        existing.owl_iri = owl_iri
                    else:
                        mapping = OWLEntityMapping(
                            type_entite="employe",
                            mysql_id=employe_id,
                            owl_iri=owl_iri
                        )
                        db.add(mapping)
                        
                elif operation == "delete":
                    db.query(OWLEntityMapping).filter_by(
                        type_entite="employe",
                        mysql_id=employe_id
                    ).delete()
                
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            
            logger.info(f"✅ Employé synchronisé: {prenom} {nom} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation de l'employé: {e}")
            return False

    @staticmethod
    def sync_offre(offre_id: int, titre: str, operation: str = "add", db: Session = None):
        """Synchroniser une offre avec l'ontologie"""
        try:
            # Utiliser la méthode de synchronisation de ontology_service
            ontology_service.synchronize_offre(offre_id, titre, operation)
            
            if db:
                owl_iri = f"http://smartrecruit.org/ontologie#Offre_{offre_id}"
                
                if operation in ["add", "update"]:
                    existing = db.query(OWLEntityMapping).filter_by(
                        type_entite="offre",
                        mysql_id=offre_id
                    ).first()
                    
                    if existing:
                        existing.owl_iri = owl_iri
                    else:
                        mapping = OWLEntityMapping(
                            type_entite="offre",
                            mysql_id=offre_id,
                            owl_iri=owl_iri
                        )
                        db.add(mapping)
                        
                elif operation == "delete":
                    db.query(OWLEntityMapping).filter_by(
                        type_entite="offre",
                        mysql_id=offre_id
                    ).delete()
                
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            
            logger.info(f"✅ Offre synchronisée: {titre} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation de l'offre: {e}")
            return False

    @staticmethod
    def sync_candidat_competence(candidat_id: int, competence_id: int, niveau: str = "INTERMEDIAIRE", 
                                  operation: str = "add"):
        """Synchroniser une relation candidat-compétence"""
        try:
            if operation == "add":
                ontology_service.add_candidat_competence(str(candidat_id), str(competence_id), niveau)
            elif operation == "delete":
                # Supprimer la relation
                candidat_uri = ontology_service.ns[f"Candidat_{candidat_id}"]
                competence_uri = ontology_service.ns[f"Competence_{competence_id}"]
                ontology_service.graph.remove((candidat_uri, ontology_service.ns.possedeCompetence, competence_uri))
            
            ontology_service.save_ontology()
            logger.info(f"✅ Relation candidat-compétence synchronisée: Candidat_{candidat_id} - Competence_{competence_id} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation candidat-compétence: {e}")
            return False

    @staticmethod
    def sync_offre_competence(offre_id: int, competence_id: int, operation: str = "add"):
        """Synchroniser une relation offre-compétence"""
        try:
            if operation == "add":
                ontology_service.add_offre_competence(str(offre_id), str(competence_id))
            elif operation == "delete":
                # Supprimer la relation
                offre_uri = ontology_service.ns[f"Offre_{offre_id}"]
                competence_uri = ontology_service.ns[f"Competence_{competence_id}"]
                ontology_service.graph.remove((offre_uri, ontology_service.ns.necessiteCompetence, competence_uri))
            
            ontology_service.save_ontology()
            logger.info(f"✅ Relation offre-compétence synchronisée: Offre_{offre_id} - Competence_{competence_id} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation offre-compétence: {e}")
            return False

    @staticmethod
    def sync_employe_competence(employe_id: int, competence_id: int, niveau: str = "INTERMEDIAIRE", 
                                 operation: str = "add"):
        """Synchroniser une relation employé-compétence"""
        try:
            if operation == "add":
                ontology_service.add_employe_competence(str(employe_id), str(competence_id), niveau)
            elif operation == "delete":
                # Supprimer la relation
                employe_uri = ontology_service.ns[f"Employe_{employe_id}"]
                competence_uri = ontology_service.ns[f"Competence_{competence_id}"]
                ontology_service.graph.remove((employe_uri, ontology_service.ns.possedeCompetence, competence_uri))
            
            ontology_service.save_ontology()
            logger.info(f"✅ Relation employé-compétence synchronisée: Employe_{employe_id} - Competence_{competence_id} ({operation})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation employé-compétence: {e}")
            return False

    @staticmethod
    def synchroniser_tout(db: Session = None):
        """
        Synchroniser toutes les données avec l'ontologie
        Cette méthode est appelée lors de la resynchronisation complète
        """
        try:
            from app.core.database import SessionLocal
            from sqlalchemy import text
            
            local_db = db or SessionLocal()
            
            try:
                logger.info("🔄 Synchronisation complète des données avec l'ontologie...")
                
                # 1. Synchroniser les compétences
                result = local_db.execute(text("SELECT id, nom, categorie FROM competences"))
                for row in result.fetchall():
                    SyncService.sync_competence(row[0], row[1], row[2], "add", local_db)
                
                # 2. Synchroniser les candidats
                result = local_db.execute(text("SELECT id, email FROM utilisateurs WHERE role = 'candidat'"))
                for row in result.fetchall():
                    SyncService.sync_candidat(row[0], row[1], "add", local_db)
                
                # 3. Synchroniser les entreprises
                result = local_db.execute(text("SELECT id, email FROM utilisateurs WHERE role = 'entreprise'"))
                for row in result.fetchall():
                    SyncService.sync_entreprise(row[0], row[1], "add", local_db)
                
                # 4. Synchroniser les offres
                result = local_db.execute(text("SELECT id, titre FROM offres_emploi"))
                for row in result.fetchall():
                    SyncService.sync_offre(row[0], row[1], "add", local_db)
                
                # 5. Synchroniser les employés
                result = local_db.execute(text("""
                    SELECT e.id, e.nom, e.prenom, e.email, u.id as utilisateur_id
                    FROM employes e
                    LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
                """))
                for row in result.fetchall():
                    # Récupérer l'entreprise via l'utilisateur
                    entreprise_id = None
                    if row[4]:
                        ent_result = local_db.execute(
                            text("SELECT id FROM entreprises WHERE utilisateur_id = :user_id"),
                            {"user_id": row[4]}
                        )
                        ent_row = ent_result.fetchone()
                        if ent_row:
                            entreprise_id = ent_row[0]
                    
                    SyncService.sync_employe(
                        row[0], row[1], row[2], row[3], entreprise_id, "add", local_db
                    )
                
                logger.info("✅ Synchronisation complète terminée avec succès")
                return True
                
            except Exception as e:
                logger.error(f"❌ Erreur lors de la synchronisation complète: {e}")
                return False
            finally:
                if db is None:
                    local_db.close()
                    
        except Exception as e:
            logger.error(f"❌ Erreur lors de la synchronisation complète: {e}")
            return False


# Instance globale du service de synchronisation
sync_service = SyncService()