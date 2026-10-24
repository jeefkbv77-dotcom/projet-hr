"""
Routes API pour la gestion des notifications
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.notification import Notification, StatutNotificationEnum
from app.schemas.notification import NotificationResponse
from app.models.utilisateur import Utilisateur

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lister les notifications de l'utilisateur courant"""
    return db.query(Notification).filter(Notification.utilisateur_id == current_user.id).order_by(Notification.date_creation.desc()).all()


@router.put("/{notification_id}/lu")
async def marquer_notification_lue(
    notification_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marquer une notification comme lue"""
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.utilisateur_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification non trouvée")

    notification.statut = StatutNotificationEnum.LUE
    notification.date_lecture = func.now()
    db.commit()
    return {"message": "Notification marquée comme lue"}


@router.delete("/{notification_id}")
async def supprimer_notification(
    notification_id: int,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer une notification"""
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.utilisateur_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification non trouvée")

    db.delete(notification)
    db.commit()
    return {"message": "Notification supprimée"}
