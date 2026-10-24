# backend/app/schemas/__init__.py
"""
Schémas Pydantic
"""
from app.schemas.utilisateur import (
    UtilisateurBase,
    UtilisateurCreate,
    UtilisateurLogin,
    UtilisateurResponse,
    Token,
    TokenData
)
from app.schemas.candidat import (
    CandidatBase,
    CandidatCreate,
    CandidatUpdate,
    CandidatResponse,
    CandidatProfilResponse
)
from app.schemas.entreprise import (
    EntrepriseBase,
    EntrepriseCreate,
    EntrepriseUpdate,
    EntrepriseResponse
)
from app.schemas.competence import (
    CompetenceBase,
    CompetenceCreate,
    CompetenceUpdate,
    CompetenceResponse,
    CompetenceAjout
)
from app.schemas.formation import (
    FormationBase,
    FormationCreate,
    FormationUpdate,
    FormationResponse
)
from app.schemas.offre import (
    OffreBase,
    OffreCreate,
    OffreUpdate,
    OffreResponse,
    OffreDetailResponse
)
from app.schemas.candidature import (
    CandidatureBase,
    CandidatureCreate,
    CandidatureUpdate,
    CandidatureResponse,
    CandidatureDetailResponse
)
from app.schemas.poste import (
    PosteBase,
    PosteCreate,
    PosteResponse
)
from app.schemas.contrat import (
    ContratBase,
    ContratCreate,
    ContratResponse
)
from app.schemas.departement import (
    DepartementBase,
    DepartementCreate,
    DepartementResponse
)
from app.schemas.employe import (
    EmployeBase,
    EmployeCreate,
    EmployeResponse
)
from app.schemas.notification import (
    NotificationResponse,
)

__all__ = [
    # Utilisateur
    "UtilisateurBase",
    "UtilisateurCreate",
    "UtilisateurLogin",
    "UtilisateurResponse",
    "Token",
    "TokenData",
    
    # Candidat
    "CandidatBase",
    "CandidatCreate",
    "CandidatUpdate",
    "CandidatResponse",
    "CandidatProfilResponse",
    
    # Entreprise
    "EntrepriseBase",
    "EntrepriseCreate",
    "EntrepriseUpdate",
    "EntrepriseResponse",
    
    # Compétence
    "CompetenceBase",
    "CompetenceCreate",
    "CompetenceUpdate",
    "CompetenceResponse",
    "CompetenceAjout",
    
    # Formation
    "FormationBase",
    "FormationCreate",
    "FormationUpdate",
    "FormationResponse",
    
    # Offre
    "OffreBase",
    "OffreCreate",
    "OffreUpdate",
    "OffreResponse",
    "OffreDetailResponse",
    
    # Candidature
    "CandidatureBase",
    "CandidatureCreate",
    "CandidatureUpdate",
    "CandidatureResponse",
    "CandidatureDetailResponse",
    
    # Notification
    "NotificationResponse",
    
    # Poste
    "PosteBase",
    "PosteCreate",
    "PosteResponse",
    
    # Contrat
    "ContratBase",
    "ContratCreate",
    "ContratResponse",
    
    # ⭐ NOUVEAUX SCHÉMAS
    "DepartementBase",
    "DepartementCreate",
    "DepartementResponse",
    "EmployeBase",
    "EmployeCreate",
    "EmployeResponse",
]