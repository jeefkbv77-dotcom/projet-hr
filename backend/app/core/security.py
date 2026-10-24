# backend/app/core/security.py
"""
Fonctions de sécurité pour l'authentification JWT et le hachage
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from jose import JWTError, jwt
from app.core.config import settings
import hashlib
import hmac
import base64
import logging

logger = logging.getLogger(__name__)


def _legacy_hash_password(password: str) -> str:
    """Ancien hash de compatibilité pour migrer les comptes existants."""
    if not password:
        return ""
    salt = getattr(settings, "SALT_SECRET", "smartrecruit_salt_2024")
    combined = salt + password
    hash_bytes = hashlib.sha256(combined.encode('utf-8')).digest()
    return base64.b64encode(hash_bytes).decode('utf-8')


def hash_password(password: str) -> str:
    """Générer un hash PBKDF2 sécurisé avec sel interne."""
    if not password:
        return ""
    salt = getattr(settings, "SALT_SECRET", "smartrecruit_salt_2024").encode("utf-8")
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256$100000${base64.b64encode(derived).decode('utf-8')}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier si le mot de passe correspond au hash stocké."""
    if not plain_password or not hashed_password:
        return False

    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            _, iterations, stored_hash = hashed_password.split("$", 2)
            derived = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                getattr(settings, "SALT_SECRET", "smartrecruit_salt_2024").encode("utf-8"),
                int(iterations),
            )
            calculated_hash = base64.b64encode(derived).decode("utf-8")
            return hmac.compare_digest(calculated_hash, stored_hash)

        legacy_hash = _legacy_hash_password(plain_password)
        return hmac.compare_digest(legacy_hash, hashed_password)
    except Exception as e:
        logger.error(f"Erreur lors de la vérification du mot de passe : {e}")
        return False


def get_password_hash(password: str) -> str:
    """Alias pour la génération de hash de mot de passe."""
    return hash_password(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Créer un jeton d'accès JWT sécurisé"""
    to_encode = data.copy()
    
    # S'assurer que le champ 'sub' est une chaîne de caractères
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
        
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire_minutes = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)
        expire = now + timedelta(minutes=expire_minutes)
        
    to_encode.update({
        "exp": expire,
        "iat": now
    })
    
    secret_key = getattr(settings, "SECRET_KEY", "secret_key_de_test_12345")
    algorithm = getattr(settings, "ALGORITHM", "HS256")
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Décoder et valider un jeton JWT"""
    if not token:
        return None
    try:
        secret_key = getattr(settings, "SECRET_KEY", "secret_key_de_test_12345")
        algorithm = getattr(settings, "ALGORITHM", "HS256")
        
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError as e:
        logger.warning(f"Échec de validation du token JWT : {e}")
        return None
    except Exception as e:
        logger.error(f"Erreur inattendue lors du décodage du token : {e}")
        return None