"""
Modèles de base de données
"""
from app.core.database import Base
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.candidat import Candidat, NiveauEtudeEnum, DisponibiliteEnum
from app.models.entreprise import Entreprise, TailleEntrepriseEnum
from app.models.competence import Competence, CategorieCompetenceEnum
from app.models.formation import Formation
from app.models.poste import Poste, CategoriePosteEnum
from app.models.contrat import Contrat, TypeContratEnum
from app.models.offre import OffreEmploi, StatutOffreEnum
from app.models.candidature import Candidature, StatutCandidatureEnum
from app.models.departement import Departement
from app.models.employe import Employe
from app.models.fichier import Fichier, TypeFichierEnum, CategorieProprietaireEnum
from app.models.liaisons import (
    CandidatCompetence,
    CandidatFormation,
    PosteCompetence,
    OffreCompetence,
    NiveauCompetenceEnum
)
from app.models.employe_liaisons import EmployeCompetence, EmployeFormation
from app.models.messagerie import Conversation, ConversationParticipant, Message, MessageLu, UtilisateurBlocage, ConversationTypeEnum, MessageTypeEnum
from app.models.notification import Notification
from app.models.owl_mapping import OWLEntityMapping

__all__ = [
    "Base",
    "Utilisateur",
    "RoleEnum",
    "Candidat",
    "NiveauEtudeEnum",
    "DisponibiliteEnum",
    "Entreprise",
    "TailleEntrepriseEnum",
    "Competence",
    "CategorieCompetenceEnum",
    "Formation",
    "Poste",
    "CategoriePosteEnum",
    "Contrat",
    "TypeContratEnum",
    "OffreEmploi",
    "StatutOffreEnum",
    "Candidature",
    "StatutCandidatureEnum",
    "Departement",
    "Employe",
    "Fichier",
    "TypeFichierEnum",
    "CategorieProprietaireEnum",
    "CandidatCompetence",
    "CandidatFormation",
    "PosteCompetence",
    "OffreCompetence",
    "EmployeCompetence",
    "EmployeFormation",
    "NiveauCompetenceEnum",
    "Conversation",
    "ConversationParticipant",
    "Message",
    "MessageLu",
    "UtilisateurBlocage",
    "Notification",
    "OWLEntityMapping",
]
