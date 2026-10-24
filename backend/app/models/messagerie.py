"""
Modèle de messagerie instantanée et de conversation
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ConversationTypeEnum(str, enum.Enum):
    """Types de conversation"""
    INDIVIDUEL = "individuel"
    GROUPE = "groupe"


class MessageTypeEnum(str, enum.Enum):
    """Types de message"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    FILE = "file"
    VOICE = "voice"
    OTHER = "other"


class Conversation(Base):
    """Table des conversations"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type_conversation = Column(
        Enum(ConversationTypeEnum, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
        default=ConversationTypeEnum.INDIVIDUEL,
        index=True,
    )
    nom_groupe = Column(String(255), nullable=True)
    photo_groupe_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    est_archive = Column(Boolean, default=False)
    est_epingle = Column(Boolean, default=False)
    est_actif = Column(Boolean, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())

    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    """Table des participants d'une conversation"""
    __tablename__ = "conversation_participants"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    est_admin = Column(Boolean, default=False)
    est_notification_active = Column(Boolean, default=True)
    dernier_message_lu_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    date_joined = Column(DateTime(timezone=True), server_default=func.now())
    date_left = Column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", back_populates="participants")
    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id])
    dernier_message_lu = relationship("Message", foreign_keys=[dernier_message_lu_id])


class Message(Base):
    """Table des messages"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    expediteur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=False, index=True)
    type_message = Column(
        Enum(MessageTypeEnum, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
        default=MessageTypeEnum.TEXT,
    )
    contenu = Column(Text, nullable=True)
    piece_jointe_id = Column(Integer, ForeignKey("fichiers.id", ondelete="SET NULL"), nullable=True, index=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    duration = Column(Integer, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    est_modifie = Column(Boolean, default=False)
    est_supprime = Column(Boolean, default=False)
    message_parent_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    date_envoi = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())

    conversation = relationship("Conversation", back_populates="messages")
    expediteur = relationship("Utilisateur", foreign_keys=[expediteur_id])
    piece_jointe = relationship("Fichier")
    reponses = relationship("Message", remote_side=[id])


class MessageLu(Base):
    """Table de lecture des messages"""
    __tablename__ = "messages_lus"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    date_lu = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    message = relationship("Message")
    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id])


class UtilisateurBlocage(Base):
    """Table des blocages utilisateur"""
    __tablename__ = "utilisateur_blocages"

    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    bloque_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False, index=True)
    date_blocage = Column(DateTime(timezone=True), server_default=func.now(), index=True)
