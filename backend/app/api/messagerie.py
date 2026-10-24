# backend/app/api/messagerie.py
"""
Routes API pour le système de messagerie instantanée
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, text
from typing import List, Optional
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.utilisateur import Utilisateur, RoleEnum, ProfilStatutEnum
from app.models.fichier import Fichier
from app.models.messagerie import (
    Conversation,
    ConversationParticipant,
    Message,
    MessageLu,
    UtilisateurBlocage,
    ConversationTypeEnum,
    MessageTypeEnum,
)
from app.schemas.messagerie import (
    ConversationCreate,
    ConversationResponse,
    ConversationArchiveUpdate,
    ConversationPinUpdate,
    ConversationGroupUpdate,
    MessageCreate,
    MessageResponse,
    MessageUpdate,
    BlockUserRequest,
    UtilisateurSearchResponse,
)
from app.services.messagerie_service import (
    est_bloque,
    construire_utilisateur_mini,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messagerie", tags=["messagerie"])


# ⭐⭐ CORRECTION: _construire_message_response avec conversion d'Enum ⭐⭐
def _construire_message_response(db: Session, message: Message) -> dict:
    """Construire la réponse d'un message avec conversion correcte de l'Enum"""
    try:
        # ⭐ Convertir l'Enum MessageTypeEnum en string
        type_message = message.type_message
        if hasattr(type_message, 'value'):
            type_message_str = type_message.value
        else:
            type_message_str = str(type_message)
        
        lu_par_records = db.query(MessageLu).filter(MessageLu.message_id == message.id).all()
        lu_par = [
            {"utilisateur_id": lu.utilisateur_id, "date_lu": lu.date_lu}
            for lu in lu_par_records
        ]
        expediteur = message.expediteur
        
        file_url = None
        download_url = None
        if message.piece_jointe_id:
            file_url = f"/api/fichiers/{message.piece_jointe_id}/view"
            download_url = f"/api/fichiers/{message.piece_jointe_id}/download"

        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "expediteur_id": message.expediteur_id,
            "type_message": type_message_str,
            "contenu": message.contenu,
            "piece_jointe_id": message.piece_jointe_id,
            "file_name": message.file_name,
            "file_size": message.file_size,
            "mime_type": message.mime_type,
            "duration": message.duration,
            "thumbnail_url": message.thumbnail_url,
            "file_url": file_url,
            "download_url": download_url,
            "est_modifie": message.est_modifie,
            "est_supprime": message.est_supprime,
            "message_parent_id": message.message_parent_id,
            "date_envoi": message.date_envoi,
            "date_modification": message.date_modification,
            "expediteur": construire_utilisateur_mini(expediteur) if expediteur else None,
            "lu_par": lu_par,
        }
    except Exception as e:
        logger.error(f"❌ Erreur _construire_message_response: {e}")
        # Fallback sécurisé
        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "expediteur_id": message.expediteur_id,
            "type_message": "text",
            "contenu": message.contenu,
            "piece_jointe_id": None,
            "file_name": None,
            "file_size": None,
            "mime_type": None,
            "duration": None,
            "thumbnail_url": None,
            "file_url": None,
            "est_modifie": False,
            "est_supprime": False,
            "message_parent_id": None,
            "date_envoi": message.date_envoi,
            "date_modification": None,
            "expediteur": None,
            "lu_par": [],
        }


def _construire_conversation_response(db: Session, conversation: Conversation, current_user_id: int) -> dict:
    """Construire la réponse d'une conversation"""
    try:
        participants = [
            construire_utilisateur_mini(participant.utilisateur)
            for participant in conversation.participants
            if participant.utilisateur is not None
        ]
        dernier_message = None
        if conversation.messages:
            last_message = max(conversation.messages, key=lambda message: message.date_envoi or message.id)
            dernier_message = _construire_message_response(db, last_message)
        
        # ⭐ Convertir le type de conversation en string
        conv_type = conversation.type_conversation
        if hasattr(conv_type, 'value'):
            conv_type_str = conv_type.value
        else:
            conv_type_str = str(conv_type)
            
        return {
            "id": conversation.id,
            "type_conversation": conv_type_str,
            "nom_groupe": conversation.nom_groupe,
            "description": conversation.description,
            "photo_groupe_url": conversation.photo_groupe_url,
            "est_archive": conversation.est_archive,
            "est_epingle": conversation.est_epingle,
            "est_actif": conversation.est_actif,
            "date_creation": conversation.date_creation,
            "date_modification": conversation.date_modification,
            "participants": participants,
            "dernier_message": dernier_message,
        }
    except Exception as e:
        logger.error(f"❌ Erreur _construire_conversation_response: {e}")
        return {
            "id": conversation.id,
            "type_conversation": "individuel",
            "nom_groupe": None,
            "description": None,
            "photo_groupe_url": None,
            "est_archive": False,
            "est_epingle": False,
            "est_actif": True,
            "date_creation": conversation.date_creation,
            "date_modification": None,
            "participants": [],
            "dernier_message": None,
        }


# ============================================================
# ROUTES CONVERSATIONS
# ============================================================

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def creer_conversation(
    data: ConversationCreate,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle conversation individuelle ou de groupe"""
    logger.info(f"📝 Création conversation par {current_user.email}")
    
    try:
        if data.type_conversation == ConversationTypeEnum.INDIVIDUEL and len(data.participant_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une conversation individuelle doit contenir exactement un autre participant"
            )

        other_user_id = data.participant_ids[0] if data.participant_ids else None
        
        if other_user_id:
            other_user = db.query(Utilisateur).filter(Utilisateur.id == other_user_id).first()
            if not other_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Utilisateur {other_user_id} non trouvé"
                )

        if data.type_conversation == ConversationTypeEnum.INDIVIDUEL and other_user_id:
            subquery1 = db.query(ConversationParticipant.conversation_id).filter(
                ConversationParticipant.utilisateur_id == current_user.id
            ).subquery()
            
            subquery2 = db.query(ConversationParticipant.conversation_id).filter(
                ConversationParticipant.utilisateur_id == other_user_id
            ).subquery()
            
            existing_conv = db.query(Conversation).filter(
                Conversation.id.in_(subquery1),
                Conversation.id.in_(subquery2),
                Conversation.type_conversation == ConversationTypeEnum.INDIVIDUEL,
                Conversation.est_actif == True
            ).first()

            if existing_conv:
                logger.info(f"✅ Conversation existante: {existing_conv.id}")
                return _construire_conversation_response(db, existing_conv, current_user.id)

        conversation = Conversation(
            type_conversation=data.type_conversation,
            nom_groupe=data.nom_groupe,
            description=data.description,
            photo_groupe_url=data.photo_groupe_url,
            est_actif=True
        )
        db.add(conversation)
        db.flush()

        participant_ids = set(data.participant_ids + [current_user.id])
        
        for utilisateur_id in participant_ids:
            utilisateur = db.query(Utilisateur).filter(Utilisateur.id == utilisateur_id).first()
            if not utilisateur:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Utilisateur {utilisateur_id} non trouvé"
                )
            
            if est_bloque(db, current_user.id, utilisateur_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Impossible de créer une conversation avec un utilisateur bloqué"
                )
            
            participant = ConversationParticipant(
                conversation_id=conversation.id,
                utilisateur_id=utilisateur_id,
                est_admin=(utilisateur_id == current_user.id)
            )
            db.add(participant)

        db.commit()
        db.refresh(conversation)
        
        conversation_reload = db.query(Conversation).options(
            joinedload(Conversation.participants).joinedload(ConversationParticipant.utilisateur),
            joinedload(Conversation.messages).joinedload(Message.expediteur)
        ).filter(Conversation.id == conversation.id).first()
        
        logger.info(f"✅ Conversation {conversation.id} créée")
        return _construire_conversation_response(db, conversation_reload or conversation, current_user.id)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur création conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création de la conversation: {str(e)}"
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def lister_conversations(
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lister les conversations de l'utilisateur"""
    try:
        conversations = db.query(Conversation).join(ConversationParticipant).filter(
            ConversationParticipant.utilisateur_id == current_user.id,
            Conversation.est_actif == True
        ).options(
            joinedload(Conversation.participants).joinedload(ConversationParticipant.utilisateur),
            joinedload(Conversation.messages).joinedload(Message.expediteur)
        ).all()

        return [_construire_conversation_response(db, conv, current_user.id) for conv in conversations]
    except Exception as e:
        logger.error(f"❌ Erreur lister_conversations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du chargement des conversations: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir le détail d'une conversation"""
    try:
        conversation = db.query(Conversation).options(
            joinedload(Conversation.participants).joinedload(ConversationParticipant.utilisateur),
            joinedload(Conversation.messages).joinedload(Message.expediteur)
        ).filter(Conversation.id == conversation_id).first()

        if not conversation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

        if not any(part.utilisateur_id == current_user.id for part in conversation.participants):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès à la conversation refusé")

        return _construire_conversation_response(db, conversation, current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du chargement de la conversation: {str(e)}"
        )


# ============================================================
# ROUTES MESSAGES
# ============================================================

@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def envoyer_message(
    data: MessageCreate,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envoyer un message dans une conversation"""
    try:
        conversation = db.query(Conversation).options(joinedload(Conversation.participants)).filter(Conversation.id == data.conversation_id).first()
        if not conversation or not conversation.est_actif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

        if not any(part.utilisateur_id == current_user.id for part in conversation.participants):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous n'êtes pas participant de cette conversation")

        destinataires = [p.utilisateur_id for p in conversation.participants if p.utilisateur_id != current_user.id]
        for destinataire_id in destinataires:
            if est_bloque(db, current_user.id, destinataire_id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Un participant vous bloque ou est bloqué")

        if data.piece_jointe_id:
            fichier = db.query(Fichier).filter(Fichier.id == data.piece_jointe_id).first()
            if not fichier:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier joint introuvable")

        message = Message(
            conversation_id=data.conversation_id,
            expediteur_id=current_user.id,
            type_message=data.type_message,
            contenu=data.contenu,
            piece_jointe_id=data.piece_jointe_id,
            file_name=data.file_name,
            file_size=data.file_size,
            mime_type=data.mime_type,
            duration=data.duration,
            thumbnail_url=data.thumbnail_url,
            message_parent_id=data.message_parent_id,
        )
        db.add(message)
        db.flush()

        message_lu = MessageLu(
            message_id=message.id,
            utilisateur_id=current_user.id,
            date_lu=func.now()
        )
        db.add(message_lu)
        
        db.commit()
        db.refresh(message)
        return _construire_message_response(db, message)
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur envoyer_message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi du message: {str(e)}"
        )


@router.get("/messages", response_model=List[MessageResponse])
async def recuperer_messages(
    conversation_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les messages d'une conversation"""
    try:
        conversation = db.query(Conversation).options(joinedload(Conversation.participants)).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

        if not any(part.utilisateur_id == current_user.id for part in conversation.participants):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.est_supprime == False
        ).order_by(Message.date_envoi.asc()).all()

        return [_construire_message_response(db, message) for message in messages]
    except Exception as e:
        logger.error(f"❌ Erreur recuperer_messages: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du chargement des messages: {str(e)}"
        )


@router.put("/messages/{message_id}", response_model=MessageResponse)
async def modifier_message(
    message_id: int,
    data: MessageUpdate,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modifier le contenu d'un message"""
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message or message.est_supprime:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message non trouvé")

        if message.expediteur_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez modifier que vos propres messages")

        if data.contenu is not None:
            message.contenu = data.contenu
        message.est_modifie = True
        db.commit()
        db.refresh(message)
        return _construire_message_response(db, message)
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur modifier_message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la modification du message: {str(e)}"
        )


@router.delete("/messages/{message_id}")
async def supprimer_message(
    message_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer un message (soft delete)"""
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message non trouvé")

        if message.expediteur_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez supprimer que vos propres messages")

        message.est_supprime = True
        db.commit()
        return {"message": "Message supprimé avec succès"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur supprimer_message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du message: {str(e)}"
        )


@router.get("/messages/{message_id}/lu")
async def marquer_message_lu(
    message_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marquer un message comme lu"""
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message non trouvé")

        conversation = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == message.conversation_id,
            ConversationParticipant.utilisateur_id == current_user.id
        ).first()
        if not conversation:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

        lu = db.query(MessageLu).filter(
            MessageLu.message_id == message_id,
            MessageLu.utilisateur_id == current_user.id
        ).first()
        if not lu:
            lu = MessageLu(message_id=message_id, utilisateur_id=current_user.id)
            db.add(lu)
        else:
            lu.date_lu = func.now()
        db.commit()
        return {"message": "Message marqué comme lu"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur marquer_message_lu: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du marquage comme lu: {str(e)}"
        )


# ============================================================
# ROUTES BLOCAGE
# ============================================================

@router.post("/utilisateurs/bloquer")
async def bloquer_utilisateur(
    data: BlockUserRequest,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bloquer un utilisateur"""
    try:
        if data.bloque_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Impossible de se bloquer soi-même")

        utilisateur = db.query(Utilisateur).filter(Utilisateur.id == data.bloque_id).first()
        if not utilisateur:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

        existing = db.query(UtilisateurBlocage).filter(
            UtilisateurBlocage.utilisateur_id == current_user.id,
            UtilisateurBlocage.bloque_id == data.bloque_id
        ).first()
        if existing:
            return {"message": "Utilisateur déjà bloqué"}

        blocage = UtilisateurBlocage(utilisateur_id=current_user.id, bloque_id=data.bloque_id)
        db.add(blocage)
        db.commit()
        return {"message": "Utilisateur bloqué avec succès"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur bloquer_utilisateur: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du blocage: {str(e)}"
        )


@router.delete("/utilisateurs/bloquer/{bloque_id}")
async def debloquer_utilisateur(
    bloque_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Débloquer un utilisateur"""
    try:
        blocage = db.query(UtilisateurBlocage).filter(
            UtilisateurBlocage.utilisateur_id == current_user.id,
            UtilisateurBlocage.bloque_id == bloque_id
        ).first()
        if not blocage:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocage introuvable")

        db.delete(blocage)
        db.commit()
        return {"message": "Utilisateur débloqué"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur debloquer_utilisateur: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du déblocage: {str(e)}"
        )


# ============================================================
# RECHERCHE ET CONTACTS
# ============================================================

@router.get("/utilisateurs/recherche", response_model=List[dict])
async def rechercher_utilisateurs(
    q: str,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rechercher des utilisateurs"""
    logger.info(f"🔍 Recherche: '{q}' par {current_user.email}")
    
    try:
        query = """
            SELECT 
                u.id, u.email, u.role, u.statut_profil,
                c.nom as candidat_nom, c.prenom as candidat_prenom,
                e.nom as entreprise_nom
            FROM utilisateurs u
            LEFT JOIN candidats c ON c.utilisateur_id = u.id
            LEFT JOIN entreprises e ON e.utilisateur_id = u.id
            WHERE u.id != :user_id
            AND u.actif = 1
            AND (
                u.email LIKE :search
                OR c.nom LIKE :search
                OR c.prenom LIKE :search
                OR e.nom LIKE :search
            )
            LIMIT 20
        """
        
        result = db.execute(
            text(query),
            {"user_id": current_user.id, "search": f"%{q}%"}
        ).fetchall()
        
        users = []
        for row in result:
            if row.candidat_prenom and row.candidat_nom:
                display_name = f"{row.candidat_prenom} {row.candidat_nom}"
            elif row.entreprise_nom:
                display_name = row.entreprise_nom
            else:
                display_name = row.email
            
            users.append({
                "id": row.id,
                "email": row.email,
                "role": str(row.role),
                "statut_profil": str(row.statut_profil) if row.statut_profil else None,
                "photo_profil_url": None,
                "display_name": display_name
            })
        
        return users
        
    except Exception as e:
        logger.error(f"❌ Erreur recherche: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la recherche: {str(e)}"
        )


@router.get("/utilisateurs/contacts", response_model=List[dict])
async def contacts_suggeres(
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retourne les contacts suggérés"""
    logger.info(f"📋 Contacts suggérés pour {current_user.email}")
    
    try:
        contacts = []
        from app.models.entreprise import Entreprise
        
        if current_user.role == RoleEnum.ENTREPRISE:
            entreprise = db.query(Entreprise).filter(
                Entreprise.utilisateur_id == current_user.id
            ).first()
            
            if entreprise:
                query = """
                    SELECT 
                        u.id, u.email, u.role, u.statut_profil,
                        c.nom, c.prenom
                    FROM utilisateurs u
                    LEFT JOIN candidats c ON c.utilisateur_id = u.id
                    WHERE u.entreprise_actuelle_id = :entreprise_id
                    AND u.id != :user_id
                    AND u.actif = 1
                    LIMIT 20
                """
                result = db.execute(
                    text(query),
                    {"entreprise_id": entreprise.id, "user_id": current_user.id}
                ).fetchall()
                
                for row in result:
                    display_name = f"{row.prenom} {row.nom}".strip() or row.email
                    contacts.append({
                        "id": row.id,
                        "email": row.email,
                        "role": str(row.role),
                        "statut_profil": str(row.statut_profil) if row.statut_profil else None,
                        "photo_profil_url": None,
                        "display_name": display_name
                    })
        
        elif current_user.statut_profil == ProfilStatutEnum.EMPLOYE and current_user.entreprise_actuelle_id:
            entreprise = db.query(Entreprise).filter(
                Entreprise.id == current_user.entreprise_actuelle_id
            ).first()
            
            if entreprise:
                user_ent = db.query(Utilisateur).filter(
                    Utilisateur.id == entreprise.utilisateur_id
                ).first()
                if user_ent and user_ent.id != current_user.id:
                    contacts.append({
                        "id": user_ent.id,
                        "email": user_ent.email,
                        "role": str(user_ent.role),
                        "statut_profil": str(user_ent.statut_profil) if user_ent.statut_profil else None,
                        "photo_profil_url": None,
                        "display_name": entreprise.nom
                    })
                
                query = """
                    SELECT 
                        u.id, u.email, u.role, u.statut_profil,
                        c.nom, c.prenom
                    FROM utilisateurs u
                    LEFT JOIN candidats c ON c.utilisateur_id = u.id
                    WHERE u.entreprise_actuelle_id = :entreprise_id
                    AND u.statut_profil = 'employe'
                    AND u.id != :user_id
                    AND u.actif = 1
                    LIMIT 20
                """
                result = db.execute(
                    text(query),
                    {"entreprise_id": current_user.entreprise_actuelle_id, "user_id": current_user.id}
                ).fetchall()
                
                for row in result:
                    display_name = f"{row.prenom} {row.nom}".strip() or row.email
                    contacts.append({
                        "id": row.id,
                        "email": row.email,
                        "role": str(row.role),
                        "statut_profil": str(row.statut_profil) if row.statut_profil else None,
                        "photo_profil_url": None,
                        "display_name": display_name
                    })
        
        else:
            query = """
                SELECT DISTINCT
                    u.id, u.email, u.role, u.statut_profil,
                    e.nom as entreprise_nom
                FROM utilisateurs u
                JOIN entreprises e ON e.utilisateur_id = u.id
                JOIN offres_emploi o ON o.entreprise_id = e.id
                WHERE o.statut = 'ACTIVE'
                AND u.id != :user_id
                AND u.actif = 1
                LIMIT 20
            """
            result = db.execute(
                text(query),
                {"user_id": current_user.id}
            ).fetchall()
            
            for row in result:
                contacts.append({
                    "id": row.id,
                    "email": row.email,
                    "role": str(row.role),
                    "statut_profil": str(row.statut_profil) if row.statut_profil else None,
                    "photo_profil_url": None,
                    "display_name": row.entreprise_nom or row.email
                })
        
        if current_user.role == RoleEnum.ADMIN and not contacts:
            query = """
                SELECT 
                    u.id, u.email, u.role, u.statut_profil,
                    c.nom as candidat_nom, c.prenom as candidat_prenom,
                    e.nom as entreprise_nom
                FROM utilisateurs u
                LEFT JOIN candidats c ON c.utilisateur_id = u.id
                LEFT JOIN entreprises e ON e.utilisateur_id = u.id
                WHERE u.id != :user_id
                AND u.actif = 1
                LIMIT 20
            """
            result = db.execute(
                text(query),
                {"user_id": current_user.id}
            ).fetchall()
            
            for row in result:
                if row.candidat_prenom and row.candidat_nom:
                    display_name = f"{row.candidat_prenom} {row.candidat_nom}"
                elif row.entreprise_nom:
                    display_name = row.entreprise_nom
                else:
                    display_name = row.email
                    
                contacts.append({
                    "id": row.id,
                    "email": row.email,
                    "role": str(row.role),
                    "statut_profil": str(row.statut_profil) if row.statut_profil else None,
                    "photo_profil_url": None,
                    "display_name": display_name
                })
        
        return contacts[:20]
        
    except Exception as e:
        logger.error(f"❌ Erreur contacts: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des contacts: {str(e)}"
        )