# app/services/ontology_service.py
"""
Service de gestion de l'ontologie OWL
"""
import os
import logging
from typing import Dict, List, Optional, Any
from rdflib import Graph, Namespace, URIRef, Literal, RDF, RDFS, OWL, XSD
from rdflib.namespace import RDF, RDFS, OWL, XSD

logger = logging.getLogger(__name__)


class OntologyService:
    """Service pour gérer l'ontologie OWL"""
    
    def __init__(self):
        self.graph = Graph()
        self.ns = Namespace("http://smartrecruit.org/ontologie#")
        self.graph.bind("smart", self.ns)
        self.graph.bind("owl", OWL)
        self.graph.bind("rdfs", RDFS)
        self.graph.bind("rdf", RDF)
        self.initialized = False
        self._load_ontology()
    
    def _get_ontology_path(self):
        """Obtenir le chemin de l'ontologie"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Remonter jusqu'à backend/
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        
        # 1. D'abord chercher dans backend/ontology/
        backend_ontology = os.path.join(backend_dir, "ontology", "smartrecruit.owl")
        if os.path.exists(backend_ontology):
            logger.info(f"📁 Ontologie trouvée dans backend/ontology/")
            return backend_ontology
        
        # 2. Ensuite chercher à la racine du projet
        project_root = os.path.dirname(backend_dir)
        root_ontology = os.path.join(project_root, "ontology", "smartrecruit.owl")
        if os.path.exists(root_ontology):
            logger.info(f"📁 Ontologie trouvée dans ontology/ (racine)")
            return root_ontology
        
        # 3. Créer le dossier backend/ontology/ si nécessaire
        os.makedirs(os.path.dirname(backend_ontology), exist_ok=True)
        logger.info(f"📁 Création de backend/ontology/ pour l'ontologie")
        return backend_ontology
    
    def _load_ontology(self):
        """Charger l'ontologie existante ou en créer une nouvelle"""
        ontology_path = self._get_ontology_path()
        if os.path.exists(ontology_path):
            try:
                self.graph.parse(ontology_path, format='xml')
                self.initialized = True
                logger.info(f"✅ Ontologie chargée depuis {ontology_path}")
                logger.info(f"   {len(self.graph)} triples chargés")
            except Exception as e:
                logger.warning(f"⚠️ Erreur lors du chargement de l'ontologie: {e}")
                self._create_base_ontology()
        else:
            self._create_base_ontology()
    
    def _create_base_ontology(self):
        """Créer l'ontologie de base avec les classes principales"""
        logger.info("🏗️ Création de l'ontologie de base...")
        
        # Classes principales
        classes = [
            ("Thing", "Classe racine"),
            ("Personne", "Personne physique"),
            ("Entreprise", "Entreprise qui recrute"),
            ("Candidat", "Personne qui cherche un emploi"),
            ("Employe", "Personne employée dans une entreprise"),
            ("OffreEmploi", "Offre d'emploi"),
            ("Competence", "Compétence professionnelle"),
            ("Candidature", "Candidature à une offre"),
            ("Contrat", "Type de contrat"),
            ("Departement", "Département d'une entreprise"),
            ("Poste", "Poste de travail"),
            ("Formation", "Formation professionnelle")
        ]
        
        for class_name, description in classes:
            class_uri = self.ns[class_name]
            self.graph.add((class_uri, RDF.type, OWL.Class))
            self.graph.add((class_uri, RDFS.label, Literal(class_name, lang="fr")))
            self.graph.add((class_uri, RDFS.comment, Literal(description, lang="fr")))
            if class_name != "Thing":
                self.graph.add((class_uri, RDFS.subClassOf, self.ns.Thing))
        
        # Propriétés d'objet
        object_properties = {
            "possedeCompetence": {
                "domain": self.ns.Personne,
                "range": self.ns.Competence,
                "label": "possède compétence",
                "inverse": None
            },
            "postuleA": {
                "domain": self.ns.Candidat,
                "range": self.ns.OffreEmploi,
                "label": "postule à",
                "inverse": None
            },
            "publieOffre": {
                "domain": self.ns.Entreprise,
                "range": self.ns.OffreEmploi,
                "label": "publie offre",
                "inverse": None
            },
            "necessiteCompetence": {
                "domain": self.ns.OffreEmploi,
                "range": self.ns.Competence,
                "label": "nécessite compétence",
                "inverse": None
            },
            "concernePoste": {
                "domain": self.ns.OffreEmploi,
                "range": self.ns.Poste,
                "label": "concerne poste",
                "inverse": None
            },
            "aPourContrat": {
                "domain": self.ns.OffreEmploi,
                "range": self.ns.Contrat,
                "label": "a pour contrat",
                "inverse": None
            },
            "travailleDans": {
                "domain": self.ns.Employe,
                "range": self.ns.Departement,
                "label": "travaille dans",
                "inverse": None
            },
            "estEmployePar": {
                "domain": self.ns.Employe,
                "range": self.ns.Entreprise,
                "label": "est employé par",
                "inverse": "emploie"
            },
            "emploie": {
                "domain": self.ns.Entreprise,
                "range": self.ns.Employe,
                "label": "emploie",
                "inverse": "estEmployePar"
            },
            "occupePoste": {
                "domain": self.ns.Employe,
                "range": self.ns.Poste,
                "label": "occupe le poste",
                "inverse": None
            },
            "aContratEmploye": {
                "domain": self.ns.Employe,
                "range": self.ns.Contrat,
                "label": "a pour contrat",
                "inverse": None
            },
            "concerneOffre": {
                "domain": self.ns.Candidature,
                "range": self.ns.OffreEmploi,
                "label": "concerne offre",
                "inverse": None
            }
        }
        
        for prop_name, config in object_properties.items():
            prop_uri = self.ns[prop_name]
            self.graph.add((prop_uri, RDF.type, OWL.ObjectProperty))
            self.graph.add((prop_uri, RDFS.domain, config["domain"]))
            self.graph.add((prop_uri, RDFS.range, config["range"]))
            self.graph.add((prop_uri, RDFS.label, Literal(config["label"], lang="fr")))
        
        # Ajouter les relations inverses
        self.graph.add((self.ns.estEmployePar, OWL.inverseOf, self.ns.emploie))
        
        # Propriétés de données
        data_properties = {
            "aPourNom": {"domain": self.ns.Personne, "range": XSD.string, "label": "nom"},
            "aPourEmail": {"domain": self.ns.Personne, "range": XSD.string, "label": "email"},
            "aPourTitre": {"domain": self.ns.OffreEmploi, "range": XSD.string, "label": "titre"},
            "aPourDescription": {"domain": self.ns.OffreEmploi, "range": XSD.string, "label": "description"},
            "aPourSalaireMin": {"domain": self.ns.OffreEmploi, "range": XSD.decimal, "label": "salaire minimum"},
            "aPourSalaireMax": {"domain": self.ns.OffreEmploi, "range": XSD.decimal, "label": "salaire maximum"},
            "aPourLocalisation": {"domain": self.ns.OffreEmploi, "range": XSD.string, "label": "localisation"},
            "estActif": {"domain": self.ns.Personne, "range": XSD.boolean, "label": "est actif"},
            "aPourCategorie": {"domain": self.ns.Competence, "range": XSD.string, "label": "catégorie"},
            "aPourStatut": {"domain": self.ns.Candidature, "range": XSD.string, "label": "statut"},
            "aPourDate": {"domain": self.ns.Candidature, "range": XSD.dateTime, "label": "date"},
            "aPourNiveauCompetence": {"domain": self.ns.Candidat, "range": XSD.string, "label": "niveau de compétence"},
            "aPourDateEmbauche": {"domain": self.ns.Employe, "range": XSD.date, "label": "date d'embauche"},
            "aPourTitrePoste": {"domain": self.ns.Employe, "range": XSD.string, "label": "titre du poste"},
            "aPourTelephone": {"domain": self.ns.Personne, "range": XSD.string, "label": "téléphone"},
            "aPourAdresse": {"domain": self.ns.Personne, "range": XSD.string, "label": "adresse"},
        }
        
        for prop_name, config in data_properties.items():
            prop_uri = self.ns[prop_name]
            self.graph.add((prop_uri, RDF.type, OWL.DatatypeProperty))
            self.graph.add((prop_uri, RDFS.domain, config["domain"]))
            self.graph.add((prop_uri, RDFS.range, config["range"]))
            self.graph.add((prop_uri, RDFS.label, Literal(config["label"], lang="fr")))
        
        # Sauvegarder la base
        self.save_ontology()
        self.initialized = True
        logger.info("✅ Ontologie de base créée avec succès")
    
    def clear_ontology(self):
        """Vider l'ontologie mais garder la structure"""
        # Sauvegarder les classes et propriétés existantes
        classes = list(self.graph.subjects(RDF.type, OWL.Class))
        properties = list(self.graph.subjects(RDF.type, OWL.ObjectProperty)) + \
                    list(self.graph.subjects(RDF.type, OWL.DatatypeProperty))
        
        # Créer un nouveau graphe
        self.graph = Graph()
        self.graph.bind("smart", self.ns)
        self.graph.bind("owl", OWL)
        self.graph.bind("rdfs", RDFS)
        self.graph.bind("rdf", RDF)
        
        # Réajouter la structure
        for cls in classes:
            for pred, obj in self.graph.predicate_objects(cls):
                self.graph.add((cls, pred, obj))
        
        for prop in properties:
            for pred, obj in self.graph.predicate_objects(prop):
                self.graph.add((prop, pred, obj))
        
        logger.info("🧹 Ontologie vidée (structure conservée)")
    
    # ============================================
    # MÉTHODES D'AJOUT D'INDIVIDUS
    # ============================================
    
    def add_competence(self, id: str, nom: str, categorie: str = "autre"):
        """Ajouter une compétence à l'ontologie"""
        competence_uri = self.ns[f"Competence_{id}"]
        
        self.graph.add((competence_uri, RDF.type, self.ns.Competence))
        self.graph.add((competence_uri, RDF.type, OWL.NamedIndividual))
        self.graph.add((competence_uri, RDFS.label, Literal(nom, lang="fr")))
        self.graph.add((competence_uri, self.ns.aPourNom, Literal(nom)))
        self.graph.add((competence_uri, self.ns.aPourCategorie, Literal(categorie)))
        
        logger.debug(f"✅ Compétence ajoutée: {nom} ({categorie})")
    
    def add_candidat(self, id: str, email: str, actif: bool = True):
        """Ajouter un candidat à l'ontologie"""
        candidat_uri = self.ns[f"Candidat_{id}"]
        
        self.graph.add((candidat_uri, RDF.type, self.ns.Candidat))
        self.graph.add((candidat_uri, RDF.type, OWL.NamedIndividual))
        self.graph.add((candidat_uri, self.ns.aPourEmail, Literal(email)))
        self.graph.add((candidat_uri, self.ns.estActif, Literal(actif, datatype=XSD.boolean)))
        self.graph.add((candidat_uri, RDFS.label, Literal(email, lang="fr")))
        
        logger.debug(f"✅ Candidat ajouté: {email}")
    
    def add_entreprise(self, id: str, email: str, actif: bool = True):
        """Ajouter une entreprise à l'ontologie"""
        entreprise_uri = self.ns[f"Entreprise_{id}"]
        
        self.graph.add((entreprise_uri, RDF.type, self.ns.Entreprise))
        self.graph.add((entreprise_uri, RDF.type, OWL.NamedIndividual))
        self.graph.add((entreprise_uri, self.ns.aPourEmail, Literal(email)))
        self.graph.add((entreprise_uri, self.ns.estActif, Literal(actif, datatype=XSD.boolean)))
        self.graph.add((entreprise_uri, RDFS.label, Literal(email, lang="fr")))
        
        logger.debug(f"✅ Entreprise ajoutée: {email}")
    
    def add_employe(self, id: str, nom: str, prenom: str, email: str, 
                    entreprise_id: Optional[str] = None, 
                    poste_id: Optional[str] = None,
                    departement_id: Optional[str] = None,
                    contrat_id: Optional[str] = None,
                    titre_poste: str = "",
                    date_embauche: str = "",
                    telephone: str = "",
                    adresse: str = ""):
        """
        Ajouter un employé à l'ontologie avec toutes ses relations
        """
        employe_uri = self.ns[f"Employe_{id}"]
        nom_complet = f"{prenom} {nom}"
        
        # Type
        self.graph.add((employe_uri, RDF.type, self.ns.Employe))
        self.graph.add((employe_uri, RDF.type, OWL.NamedIndividual))
        self.graph.add((employe_uri, RDFS.label, Literal(nom_complet, lang="fr")))
        
        # Informations personnelles
        self.graph.add((employe_uri, self.ns.aPourNom, Literal(nom_complet)))
        self.graph.add((employe_uri, self.ns.aPourEmail, Literal(email)))
        if telephone:
            self.graph.add((employe_uri, self.ns.aPourTelephone, Literal(telephone)))
        if adresse:
            self.graph.add((employe_uri, self.ns.aPourAdresse, Literal(adresse)))
        
        # Titre du poste
        if titre_poste:
            self.graph.add((employe_uri, self.ns.aPourTitrePoste, Literal(titre_poste)))
        
        # Date d'embauche
        if date_embauche:
            self.graph.add((employe_uri, self.ns.aPourDateEmbauche, Literal(date_embauche, datatype=XSD.date)))
        
        # ⭐ RELATION AVEC L'ENTREPRISE (la plus importante)
        if entreprise_id:
            entreprise_uri = self.ns[f"Entreprise_{entreprise_id}"]
            self.graph.add((employe_uri, self.ns.estEmployePar, entreprise_uri))
            self.graph.add((entreprise_uri, self.ns.emploie, employe_uri))
            logger.debug(f"✅ Relation employé-entreprise: {nom_complet} → Entreprise_{entreprise_id}")
        
        # Relation avec le poste
        if poste_id:
            poste_uri = self.ns[f"Poste_{poste_id}"]
            self.graph.add((employe_uri, self.ns.occupePoste, poste_uri))
            logger.debug(f"✅ Relation employé-poste: {nom_complet} → Poste_{poste_id}")
        
        # Relation avec le département
        if departement_id:
            departement_uri = self.ns[f"Departement_{departement_id}"]
            self.graph.add((employe_uri, self.ns.travailleDans, departement_uri))
            logger.debug(f"✅ Relation employé-département: {nom_complet} → Departement_{departement_id}")
        
        # Relation avec le contrat
        if contrat_id:
            contrat_uri = self.ns[f"Contrat_{contrat_id}"]
            self.graph.add((employe_uri, self.ns.aContratEmploye, contrat_uri))
            logger.debug(f"✅ Relation employé-contrat: {nom_complet} → Contrat_{contrat_id}")
        
        logger.info(f"✅ Employé ajouté: {nom_complet} ({email})")
    
    def add_offre(self, id: str, titre: str, description: str = "", 
                  entreprise_id: Optional[str] = None, 
                  competences_ids: List[str] = None, 
                  actif: bool = True):
        """Ajouter une offre d'emploi à l'ontologie"""
        offre_uri = self.ns[f"Offre_{id}"]
        
        self.graph.add((offre_uri, RDF.type, self.ns.OffreEmploi))
        self.graph.add((offre_uri, RDF.type, OWL.NamedIndividual))
        self.graph.add((offre_uri, self.ns.aPourTitre, Literal(titre)))
        self.graph.add((offre_uri, self.ns.aPourDescription, Literal(description)))
        self.graph.add((offre_uri, self.ns.estActif, Literal(actif, datatype=XSD.boolean)))
        self.graph.add((offre_uri, RDFS.label, Literal(titre, lang="fr")))
        
        if entreprise_id:
            entreprise_uri = self.ns[f"Entreprise_{entreprise_id}"]
            self.graph.add((entreprise_uri, self.ns.publieOffre, offre_uri))
        
        if competences_ids:
            for comp_id in competences_ids:
                comp_uri = self.ns[f"Competence_{comp_id}"]
                self.graph.add((offre_uri, self.ns.necessiteCompetence, comp_uri))
        
        logger.debug(f"✅ Offre ajoutée: {titre}")
    
    def add_candidature(self, id: str, candidat_id: Optional[str] = None, 
                        offre_id: Optional[str] = None, statut: str = "en_attente"):
        """Ajouter une candidature à l'ontologie"""
        candidature_uri = self.ns[f"Candidature_{id}"]
        
        self.graph.add((candidature_uri, RDF.type, self.ns.Candidature))
        self.graph.add((candidature_uri, RDF.type, OWL.NamedIndividual))
        self.graph.add((candidature_uri, self.ns.aPourStatut, Literal(statut)))
        
        if candidat_id:
            candidat_uri = self.ns[f"Candidat_{candidat_id}"]
            self.graph.add((candidat_uri, self.ns.postuleA, candidature_uri))
        
        if offre_id:
            offre_uri = self.ns[f"Offre_{offre_id}"]
            self.graph.add((candidature_uri, self.ns.concerneOffre, offre_uri))
        
        logger.debug(f"✅ Candidature ajoutée: {id}")
    
    # ============================================
    # MÉTHODES DE RELATIONS
    # ============================================
    
    def add_candidat_competence(self, candidat_id: str, competence_id: str, niveau: str = "INTERMEDIAIRE"):
        """
        Ajouter une relation candidat-compétence
        """
        candidat_uri = self.ns[f"Candidat_{candidat_id}"]
        competence_uri = self.ns[f"Competence_{competence_id}"]
        
        # Ajouter la relation de possession de compétence
        self.graph.add((candidat_uri, self.ns.possedeCompetence, competence_uri))
        self.graph.add((candidat_uri, self.ns.aPourNiveauCompetence, Literal(niveau)))
        
        logger.debug(f"✅ Relation candidat-compétence: Candidat_{candidat_id} - Competence_{competence_id} ({niveau})")
    
    def add_offre_competence(self, offre_id: str, competence_id: str):
        """
        Ajouter une relation offre-compétence
        """
        offre_uri = self.ns[f"Offre_{offre_id}"]
        competence_uri = self.ns[f"Competence_{competence_id}"]
        
        # Ajouter la relation de nécessité de compétence
        self.graph.add((offre_uri, self.ns.necessiteCompetence, competence_uri))
        
        logger.debug(f"✅ Relation offre-compétence: Offre_{offre_id} - Competence_{competence_id}")
    
    def add_employe_competence(self, employe_id: str, competence_id: str, niveau: str = "INTERMEDIAIRE"):
        """
        Ajouter une relation employé-compétence
        """
        employe_uri = self.ns[f"Employe_{employe_id}"]
        competence_uri = self.ns[f"Competence_{competence_id}"]
        
        self.graph.add((employe_uri, self.ns.possedeCompetence, competence_uri))
        self.graph.add((employe_uri, self.ns.aPourNiveauCompetence, Literal(niveau)))
        
        logger.debug(f"✅ Relation employé-compétence: Employe_{employe_id} - Competence_{competence_id}")
    
    # ============================================
    # MÉTHODES DE SYNCHRONISATION (pour sync_service)
    # ============================================
    
    def synchronize_competence(self, competence_id: int, nom: str, categorie: str, operation: str = "add"):
        """Synchroniser une compétence"""
        if operation in ["add", "update"]:
            self.add_competence(str(competence_id), nom, categorie)
        elif operation == "delete":
            # Supprimer la compétence
            comp_uri = self.ns[f"Competence_{competence_id}"]
            self.graph.remove((comp_uri, None, None))
        self.save_ontology()
    
    def synchronize_candidat(self, candidat_id: int, nom: str, operation: str = "add"):
        """Synchroniser un candidat"""
        if operation in ["add", "update"]:
            # Extraire email du nom ou utiliser un placeholder
            email = f"candidat_{candidat_id}@example.com" if "@" not in nom else nom
            self.add_candidat(str(candidat_id), email, True)
        elif operation == "delete":
            candidat_uri = self.ns[f"Candidat_{candidat_id}"]
            self.graph.remove((candidat_uri, None, None))
        self.save_ontology()
    
    def synchronize_entreprise(self, entreprise_id: int, nom: str, operation: str = "add"):
        """Synchroniser une entreprise"""
        if operation in ["add", "update"]:
            email = f"entreprise_{entreprise_id}@example.com" if "@" not in nom else nom
            self.add_entreprise(str(entreprise_id), email, True)
        elif operation == "delete":
            entreprise_uri = self.ns[f"Entreprise_{entreprise_id}"]
            self.graph.remove((entreprise_uri, None, None))
        self.save_ontology()
    
    def synchronize_employe(self, employe_id: int, nom: str, operation: str = "add"):
        """Synchroniser un employé"""
        if operation in ["add", "update"]:
            # Cette méthode est appelée par sync_service mais nous utilisons add_employe
            # avec plus d'informations. On garde la compatibilité.
            email = f"employe_{employe_id}@example.com"
            self.add_employe(
                id=str(employe_id),
                nom="Employe",
                prenom=nom,
                email=email,
                entreprise_id=None,
                poste_id=None,
                departement_id=None,
                contrat_id=None,
                titre_poste=""
            )
        elif operation == "delete":
            employe_uri = self.ns[f"Employe_{employe_id}"]
            self.graph.remove((employe_uri, None, None))
        self.save_ontology()
    
    def synchronize_offre(self, offre_id: int, titre: str, operation: str = "add"):
        """Synchroniser une offre"""
        if operation in ["add", "update"]:
            self.add_offre(str(offre_id), titre)
        elif operation == "delete":
            offre_uri = self.ns[f"Offre_{offre_id}"]
            self.graph.remove((offre_uri, None, None))
        self.save_ontology()
    
    # ============================================
    # MÉTHODES DE RÉCUPÉRATION D'INFORMATIONS
    # ============================================
    
    def save_ontology(self):
        """Sauvegarder l'ontologie dans un fichier"""
        try:
            ontology_path = self._get_ontology_path()
            self.graph.serialize(destination=ontology_path, format='xml')
            logger.info(f"💾 Ontologie sauvegardée dans {ontology_path}")
            logger.info(f"   {len(self.graph)} triples sauvegardés")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la sauvegarde de l'ontologie: {e}")
            raise
    
    def get_statistiques(self) -> Dict[str, int]:
        """Retourner les statistiques de l'ontologie"""
        try:
            total_triples = len(self.graph)
            
            classes = set(self.graph.subjects(RDF.type, OWL.Class))
            total_classes = len(classes)
            
            object_props = set(self.graph.subjects(RDF.type, OWL.ObjectProperty))
            data_props = set(self.graph.subjects(RDF.type, OWL.DatatypeProperty))
            total_properties = len(object_props) + len(data_props)
            
            individuals = set(self.graph.subjects(RDF.type, OWL.NamedIndividual))
            total_individuals = len(individuals)
            
            total_candidats = len(set(self.graph.subjects(RDF.type, self.ns.Candidat)))
            total_entreprises = len(set(self.graph.subjects(RDF.type, self.ns.Entreprise)))
            total_offres = len(set(self.graph.subjects(RDF.type, self.ns.OffreEmploi)))
            total_competences = len(set(self.graph.subjects(RDF.type, self.ns.Competence)))
            total_candidatures = len(set(self.graph.subjects(RDF.type, self.ns.Candidature)))
            total_employes = len(set(self.graph.subjects(RDF.type, self.ns.Employe)))
            total_contrats = len(set(self.graph.subjects(RDF.type, self.ns.Contrat)))
            total_postes = len(set(self.graph.subjects(RDF.type, self.ns.Poste)))
            total_departements = len(set(self.graph.subjects(RDF.type, self.ns.Departement)))
            total_formations = len(set(self.graph.subjects(RDF.type, self.ns.Formation)))
            
            return {
                "total_triples": total_triples,
                "total_classes": total_classes,
                "total_properties": total_properties,
                "total_individuals": total_individuals,
                "total_candidats": total_candidats,
                "total_entreprises": total_entreprises,
                "total_offres": total_offres,
                "total_competences": total_competences,
                "total_candidatures": total_candidatures,
                "total_employes": total_employes,
                "total_contrats": total_contrats,
                "total_postes": total_postes,
                "total_departements": total_departements,
                "total_formations": total_formations
            }
        except Exception as e:
            logger.error(f"❌ Erreur get_statistiques: {e}")
            return {
                "total_triples": 0,
                "total_classes": 0,
                "total_properties": 0,
                "total_individuals": 0,
                "total_candidats": 0,
                "total_entreprises": 0,
                "total_offres": 0,
                "total_competences": 0,
                "total_candidatures": 0,
                "total_employes": 0,
                "total_contrats": 0,
                "total_postes": 0,
                "total_departements": 0,
                "total_formations": 0
            }
    
    def get_all_competences(self) -> List[Dict[str, Any]]:
        """Récupérer toutes les compétences de l'ontologie"""
        competences = []
        for comp in self.graph.subjects(RDF.type, self.ns.Competence):
            nom = self.graph.value(comp, self.ns.aPourNom)
            categorie = self.graph.value(comp, self.ns.aPourCategorie)
            if nom:
                competences.append({
                    "uri": str(comp),
                    "nom": str(nom),
                    "categorie": str(categorie) if categorie else "autre"
                })
        return competences
    
    def get_candidat_competences(self, candidat_id: str) -> List[str]:
        """Récupérer les compétences d'un candidat"""
        candidat_uri = self.ns[f"Candidat_{candidat_id}"]
        competences = []
        for comp in self.graph.objects(candidat_uri, self.ns.possedeCompetence):
            nom = self.graph.value(comp, self.ns.aPourNom)
            if nom:
                competences.append(str(nom))
        return competences
    
    def get_offre_competences(self, offre_id: str) -> List[str]:
        """Récupérer les compétences requises pour une offre"""
        offre_uri = self.ns[f"Offre_{offre_id}"]
        competences = []
        for comp in self.graph.objects(offre_uri, self.ns.necessiteCompetence):
            nom = self.graph.value(comp, self.ns.aPourNom)
            if nom:
                competences.append(str(nom))
        return competences
    
    def get_employe_entreprise(self, employe_id: str) -> Optional[str]:
        """Récupérer l'entreprise d'un employé"""
        employe_uri = self.ns[f"Employe_{employe_id}"]
        for entreprise in self.graph.objects(employe_uri, self.ns.estEmployePar):
            return str(entreprise).split('#')[-1]
        return None
    
    def get_entreprise_employes(self, entreprise_id: str) -> List[str]:
        """Récupérer tous les employés d'une entreprise"""
        entreprise_uri = self.ns[f"Entreprise_{entreprise_id}"]
        employes = []
        for emp in self.graph.objects(entreprise_uri, self.ns.emploie):
            employes.append(str(emp).split('#')[-1])
        return employes


# Instance unique du service
ontology_service = OntologyService()