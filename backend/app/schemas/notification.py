from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.notification import TypeNotificationEnum, StatutNotificationEnum


class NotificationResponse(BaseModel):
    id: int
    utilisateur_id: int
    type_notification: TypeNotificationEnum
    titre: str
    message: str
    statut: StatutNotificationEnum
    offre_id: Optional[int] = None
    candidature_id: Optional[int] = None
    entreprise_id: Optional[int] = None
    donnees_supplementaires: Optional[str] = None
    url_action: Optional[str] = None
    date_creation: datetime
    date_lecture: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
