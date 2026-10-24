"""
Service de messagerie pour la logique métier de chat et blocage
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.messagerie import UtilisateurBlocage, ConversationParticipant
from app.models.utilisateur import Utilisateur
from app.models.candidat import Candidat
from app.models.entreprise import Entreprise


def _premier_profil(profil):
    """Retourne un profil SQLAlchemy scalaire ou le premier profil d'une collection."""
    if profil is None:
        return None
    if hasattr(profil, "__iter__") and not isinstance(profil, (str, bytes)):
        return next(iter(profil), None)
    return profil


def est_bloque(db: Session, expediteur_id: int, destinataire_id: int) -> bool:
    """Retourne vrai si l'un des deux utilisateurs a bloqué l'autre"""
    blocked = db.query(UtilisateurBlocage).filter(
        or_(
            (UtilisateurBlocage.utilisateur_id == expediteur_id) & (UtilisateurBlocage.bloque_id == destinataire_id),
            (UtilisateurBlocage.utilisateur_id == destinataire_id) & (UtilisateurBlocage.bloque_id == expediteur_id)
        )
    ).first()
    return blocked is not None


def construire_display_name(utilisateur: Utilisateur) -> str:
    """Construire un nom d'affichage lisible depuis le profil utilisateur"""
    candidat = _premier_profil(getattr(utilisateur, 'candidat', None))
    if candidat:
        full_name = f"{getattr(candidat, 'prenom', '') or ''} {getattr(candidat, 'nom', '') or ''}".strip()
        if full_name:
            return full_name
    entreprise = _premier_profil(getattr(utilisateur, 'profil_entreprise', None))
    if entreprise:
        if getattr(entreprise, 'nom', None):
            return entreprise.nom
    if hasattr(utilisateur, 'nom') and getattr(utilisateur, 'nom'):
        return str(utilisateur.nom)
    if hasattr(utilisateur, 'prenom') and getattr(utilisateur, 'prenom'):
        return str(utilisateur.prenom)
    return utilisateur.email


def construire_utilisateur_mini(utilisateur: Utilisateur) -> dict:
    """Retourne un objet utilisateur minimal pour la messagerie"""
    role_value = getattr(utilisateur.role, 'value', utilisateur.role)
    profile_photo_url = getattr(utilisateur, 'photo_profil_url', None)
    if not profile_photo_url:
        candidat = _premier_profil(getattr(utilisateur, 'candidat', None))
        entreprise = _premier_profil(getattr(utilisateur, 'profil_entreprise', None))
        if candidat and candidat.photo_blob:
            profile_photo_url = f"/api/candidats/by-utilisateur/{utilisateur.id}/photo"
        elif entreprise and entreprise.logo_blob:
            profile_photo_url = f"/api/entreprises/by-utilisateur/{utilisateur.id}/logo"
    return {
        "id": utilisateur.id,
        "email": utilisateur.email,
        "role": role_value,
        "statut_profil": getattr(utilisateur, 'statut_profil', None),
        "photo_profil_url": profile_photo_url,
        "display_name": construire_display_name(utilisateur)
    }
