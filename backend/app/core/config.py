# backend/app/core/config.py
"""
Configuration de l'application
"""
from pydantic_settings import BaseSettings
from typing import Optional, List
import os
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB_PATH = (PROJECT_ROOT / "smartrecruit.db").resolve()


class Settings(BaseSettings):
    """Paramètres de configuration de l'application"""
    
    # ⭐ Base de données
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
    
    # ⭐ Sécurité JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smartrecruit_secret_key_2024_secure_random_string_for_jwt_tokens")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # ⭐ CORS
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    
    # ⭐ Serveur
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # ⭐ Upload
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB
    
    # ⭐ ⭐ AJOUT : Version de l'application
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# ⭐ VÉRIFICATION DE LA CLE SECRÈTE AU DÉMARRAGE
def verify_secret_key():
    """Vérifier que la clé secrète est configurée correctement"""
    settings = Settings()
    if settings.SECRET_KEY == "smartrecruit_secret_key_2024_secure_random_string_for_jwt_tokens":
        print("⚠️  ATTENTION: La clé secrète JWT est celle par défaut!")
        print("   Modifiez la dans le fichier .env")
    return settings


# Instance unique des paramètres
settings = verify_secret_key()