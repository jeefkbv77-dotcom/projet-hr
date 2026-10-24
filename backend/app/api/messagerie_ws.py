# backend/app/api/messagerie_ws.py
"""
WebSocket endpoint for real-time messaging
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from typing import Dict, Set, Any, Optional
from jose import JWTError
import json
import logging
import asyncio
from datetime import datetime

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.utilisateur import Utilisateur
from app.models.messagerie import Message as MessageModel, MessageTypeEnum, ConversationParticipant, Conversation, MessageLu
from app.models.fichier import Fichier
from app.services.messagerie_service import construire_utilisateur_mini

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messagerie", tags=["messagerie_ws"])


class ConnectionManager:
    def __init__(self):
        # user_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # user_id -> last heartbeat time
        self.last_heartbeat: Dict[int, datetime] = {}
        # user_id -> online status (cached)
        self.online_users: Set[int] = set()

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        conns = self.active_connections.setdefault(user_id, set())
        conns.add(websocket)
        self.online_users.add(user_id)
        self.last_heartbeat[user_id] = datetime.now()
        logger.info(f"🔌 WebSocket connecté: user={user_id} connections={len(conns)}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        conns = self.active_connections.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)
            logger.info(f"🔌 WebSocket déconnecté: user={user_id} remaining={len(conns)}")
            if len(conns) == 0:
                del self.active_connections[user_id]
                self.online_users.discard(user_id)
                self.last_heartbeat.pop(user_id, None)

    async def send_personal_message(self, message: Dict[str, Any], user_id: int):
        conns = self.active_connections.get(user_id, set())
        for ws in list(conns):
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"⚠️ Erreur en envoyant WS à {user_id}: {e}")
                # Nettoyer la connexion morte
                self.disconnect(ws, user_id)

    async def broadcast(self, message: Dict[str, Any], user_ids: Set[int]):
        for uid in user_ids:
            await self.send_personal_message(message, uid)

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.online_users


manager = ConnectionManager()


def _get_user_from_token(token: str):
    payload = decode_access_token(token)
    if not payload:
        raise JWTError("Token invalide")
    email = payload.get("sub")
    if not email:
        raise JWTError("Token invalide - subject manquant")
    db = SessionLocal()
    try:
        user = db.query(Utilisateur).filter(Utilisateur.email == email.lower()).first()
        return user
    finally:
        db.close()


async def _send_heartbeat(websocket: WebSocket, user_id: int):
    """Envoyer un heartbeat périodique pour maintenir la connexion"""
    try:
        while True:
            await asyncio.sleep(30)  # Heartbeat toutes les 30 secondes
            await websocket.send_text(json.dumps({"action": "ping", "timestamp": datetime.now().isoformat()}))
            logger.debug(f"💓 Heartbeat envoyé à user={user_id}")
    except Exception as e:
        logger.debug(f"Heartbeat arrêté pour user={user_id}: {e}")


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection handling.

    Expects `?token=...` query param for authentication.
    Supports JSON messages with `action` field: send_message, typing, presence, read, ping.
    """
    params = websocket.query_params
    token = params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user = _get_user_from_token(token)
    except Exception as e:
        logger.warning(f"⚠️ WebSocket auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    # Recharger l'utilisateur dans la session qui vivra pendant toute la
    # connexion WebSocket. L'instance utilisée pour authentifier le token
    # appartient à une session déjà fermée.
    user = db.query(Utilisateur).filter(Utilisateur.id == user.id).first()
    if not user:
        db.close()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user.id)
    
    # ⭐ Démarrer le heartbeat en arrière-plan
    heartbeat_task = asyncio.create_task(_send_heartbeat(websocket, user.id))
    
    try:
        # ⭐⭐ CORRECTION #1: Mettre à jour le statut en BDD ⭐⭐
        user.est_en_ligne = True
        user.derniere_activite = datetime.now()
        db.commit()
        logger.info(f"🟢 Utilisateur {user.email} (ID: {user.id}) marqué comme en ligne")

        # Annoncer la présence à tous les utilisateurs connectés
        await manager.broadcast(
            {"action": "presence", "user_id": user.id, "status": "online"}, 
            set(manager.active_connections.keys())
        )

        while True:
            try:
                data_text = await websocket.receive_text()
            except Exception as e:
                logger.warning(f"⚠️ Erreur réception WS: {e}")
                break

            try:
                data = json.loads(data_text)
            except Exception:
                logger.warning("⚠️ WS reçu payload non JSON")
                continue

            action = data.get("action")

            # ⭐ Gérer le ping (réponse au heartbeat)
            if action == "ping":
                await websocket.send_text(json.dumps({"action": "pong", "timestamp": datetime.now().isoformat()}))
                manager.last_heartbeat[user.id] = datetime.now()
                continue

            if action == "send_message":
                conversation_id = data.get("conversation_id")
                contenu = data.get("contenu")
                type_message_raw = data.get("type_message", "text")
                try:
                    type_message = MessageTypeEnum(str(type_message_raw).lower())
                except ValueError:
                    await websocket.send_text(json.dumps({
                        "action": "error",
                        "message": f"Type de message non supporté: {type_message_raw}"
                    }))
                    continue
                piece_jointe_id = data.get("piece_jointe_id")
                file_name = data.get("file_name")
                file_size = data.get("file_size")
                mime_type = data.get("mime_type")
                duration = data.get("duration")
                thumbnail_url = data.get("thumbnail_url")
                
                file_url = None
                if piece_jointe_id:
                    file_url = f"/api/fichiers/{piece_jointe_id}/download"

                # Persist message
                try:
                    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                    if not conversation or not conversation.est_actif:
                        await websocket.send_text(json.dumps({
                            "action": "error",
                            "message": "Conversation introuvable ou inactive"
                        }))
                        continue

                    participant = db.query(ConversationParticipant).filter(
                        ConversationParticipant.conversation_id == conversation_id,
                        ConversationParticipant.utilisateur_id == user.id
                    ).first()
                    if not participant:
                        await websocket.send_text(json.dumps({
                            "action": "error",
                            "message": "Vous n'êtes pas participant de cette conversation"
                        }))
                        continue

                    # ⭐⭐ CORRECTION #3: Vérifier que le fichier existe ⭐⭐
                    if piece_jointe_id:
                        fichier = db.query(Fichier).filter(Fichier.id == piece_jointe_id).first()
                        if not fichier:
                            logger.warning(f"⚠️ Fichier {piece_jointe_id} non trouvé")
                            await websocket.send_text(json.dumps({
                                "action": "error",
                                "message": "Fichier joint introuvable"
                            }))
                            continue

                    message = MessageModel(
                        conversation_id=conversation_id,
                        expediteur_id=user.id,
                        type_message=type_message,
                        contenu=contenu,
                        piece_jointe_id=piece_jointe_id,
                        file_name=file_name,
                        file_size=file_size,
                        mime_type=mime_type,
                        duration=duration,
                        thumbnail_url=thumbnail_url
                    )
                    db.add(message)
                    db.flush()

                    # ⭐⭐ CORRECTION #4: Marquer le message comme lu par l'expéditeur ⭐⭐
                    message_lu = MessageLu(
                        message_id=message.id,
                        utilisateur_id=user.id,
                        date_lu=datetime.now()
                    )
                    db.add(message_lu)
                    
                    db.commit()
                    db.refresh(message)

                    # Determine recipients (participants of conversation)
                    participants = db.query(ConversationParticipant).filter(
                        ConversationParticipant.conversation_id == conversation_id
                    ).all()
                    recipient_ids = set(p.utilisateur_id for p in participants if p.utilisateur_id != user.id)

                    payload = {
                        "action": "message",
                        "message": {
                            "id": message.id,
                            "conversation_id": message.conversation_id,
                            "expediteur_id": message.expediteur_id,
                            "type_message": message.type_message.value if hasattr(message.type_message, "value") else str(message.type_message),
                            "contenu": message.contenu,
                            "piece_jointe_id": message.piece_jointe_id,
                            "file_name": message.file_name,
                            "file_size": message.file_size,
                            "mime_type": message.mime_type,
                            "duration": message.duration,
                            "thumbnail_url": message.thumbnail_url,
                            "file_url": file_url,
                            "download_url": f"/api/fichiers/{message.piece_jointe_id}/download" if message.piece_jointe_id else None,
                            "expediteur": construire_utilisateur_mini(user),
                            "date_envoi": message.date_envoi.isoformat() if message.date_envoi else None,
                            "est_modifie": message.est_modifie,
                            "est_supprime": message.est_supprime
                        }
                    }

                    # send to recipients and sender
                    await manager.broadcast(payload, recipient_ids | {user.id})
                    
                    # ⭐ Mettre à jour la date de dernière activité
                    user.derniere_activite = datetime.now()
                    db.commit()

                except Exception as e:
                    logger.exception("❌ Erreur persistance message WS")
                    db.rollback()
                    await websocket.send_text(json.dumps({
                        "action": "error",
                        "message": f"Erreur message: {e}" if settings.DEBUG else "Impossible d'envoyer le message vocal ou la pièce jointe"
                    }))

            elif action == "typing":
                conversation_id = data.get("conversation_id")
                is_typing = data.get("is_typing", False)
                participants = db.query(ConversationParticipant).filter(
                    ConversationParticipant.conversation_id == conversation_id
                ).all()
                recipient_ids = set(p.utilisateur_id for p in participants if p.utilisateur_id != user.id)
                await manager.broadcast(
                    {"action": "typing", "conversation_id": conversation_id, "user_id": user.id, "is_typing": is_typing},
                    recipient_ids
                )

            elif action == "presence":
                status_val = data.get("status")
                if status_val == "offline":
                    user.est_en_ligne = False
                    db.commit()
                await manager.broadcast(
                    {"action": "presence", "user_id": user.id, "status": status_val},
                    set(manager.active_connections.keys())
                )

            elif action == "read":
                # ⭐⭐ CORRECTION #4: Persister les accusés de lecture ⭐⭐
                message_id = data.get("message_id")
                if message_id:
                    try:
                        # Vérifier si déjà marqué comme lu
                        existing = db.query(MessageLu).filter(
                            MessageLu.message_id == message_id,
                            MessageLu.utilisateur_id == user.id
                        ).first()
                        
                        if not existing:
                            message_lu = MessageLu(
                                message_id=message_id,
                                utilisateur_id=user.id,
                                date_lu=datetime.now()
                            )
                            db.add(message_lu)
                            db.commit()
                            
                            # Notifier les autres participants
                            await manager.broadcast(
                                {"action": "read", "message_id": message_id, "user_id": user.id},
                                set(manager.active_connections.keys())
                            )
                    except Exception as e:
                        logger.error(f"❌ Erreur marquage lu: {e}")
                        db.rollback()

            elif action == "get_online_users":
                # Retourner la liste des utilisateurs en ligne
                await websocket.send_text(json.dumps({
                    "action": "online_users",
                    "users": list(manager.online_users)
                }))

            else:
                logger.debug(f"WS action non-prise-en-charge: {action}")

    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket déconnecté pour user={user.id}")
        # ⭐⭐ CORRECTION #1: Mettre à jour le statut en BDD ⭐⭐
        try:
            user.est_en_ligne = False
            user.derniere_activite = datetime.now()
            db.commit()
            logger.info(f"🔴 Utilisateur {user.email} (ID: {user.id}) marqué comme hors ligne")
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour statut hors ligne: {e}")
            db.rollback()
        
        manager.disconnect(websocket, user.id)
        
        # Annoncer la déconnexion
        await manager.broadcast(
            {"action": "presence", "user_id": user.id, "status": "offline"},
            set(manager.active_connections.keys())
        )
        
    except Exception as e:
        logger.error(f"❌ Erreur inattendue dans WebSocket: {e}")
        manager.disconnect(websocket, user.id)
        
    finally:
        # ⭐ Arrêter le heartbeat
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass
        db.close()