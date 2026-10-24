"""
Schemas Pydantic pour la messagerie instantanée
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.models.utilisateur import RoleEnum, ProfilStatutEnum
from app.models.messagerie import ConversationTypeEnum, MessageTypeEnum


class UtilisateurMini(BaseModel):
    id: int
    email: EmailStr
    role: RoleEnum
    statut_profil: Optional[ProfilStatutEnum] = None
    photo_profil_url: Optional[str] = None
    display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    type_conversation: ConversationTypeEnum = Field(..., description="Type de conversation individuel ou groupe")
    nom_groupe: Optional[str] = None
    description: Optional[str] = None
    photo_groupe_url: Optional[str] = None
    participant_ids: List[int] = Field(default_factory=list, description="Liste d'IDs d'utilisateurs participants")


class ConversationGroupUpdate(BaseModel):
    nom_groupe: Optional[str] = None
    description: Optional[str] = None
    photo_groupe_url: Optional[str] = None


class ConversationArchiveUpdate(BaseModel):
    est_archive: bool = Field(..., description="Marquer la conversation comme archivée ou non")


class ConversationPinUpdate(BaseModel):
    est_epingle: bool = Field(..., description="Marquer la conversation comme épinglée ou non")


class MessageCreate(BaseModel):
    conversation_id: int
    type_message: MessageTypeEnum = MessageTypeEnum.TEXT
    contenu: Optional[str] = None
    piece_jointe_id: Optional[int] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None
    message_parent_id: Optional[int] = None


class MessageUpdate(BaseModel):
    contenu: Optional[str] = None


class MessageLuResponse(BaseModel):
    utilisateur_id: int
    date_lu: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    expediteur_id: int
    type_message: MessageTypeEnum
    contenu: Optional[str] = None
    piece_jointe_id: Optional[int] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    download_url: Optional[str] = None
    est_modifie: bool
    est_supprime: bool
    message_parent_id: Optional[int] = None
    date_envoi: datetime
    date_modification: Optional[datetime] = None
    expediteur: Optional[UtilisateurMini] = None
    lu_par: List[MessageLuResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: int
    type_conversation: ConversationTypeEnum
    nom_groupe: Optional[str] = None
    description: Optional[str] = None
    photo_groupe_url: Optional[str] = None
    est_archive: bool
    est_epingle: bool
    est_actif: bool
    date_creation: datetime
    date_modification: Optional[datetime] = None
    participants: List[UtilisateurMini] = []
    dernier_message: Optional[MessageResponse] = None

    model_config = ConfigDict(from_attributes=True)


class BlockUserRequest(BaseModel):
    bloque_id: int


class UtilisateurSearchResponse(BaseModel):
    id: int
    email: EmailStr
    role: RoleEnum
    statut_profil: Optional[ProfilStatutEnum] = None
    photo_profil_url: Optional[str] = None
    display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
