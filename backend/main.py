# backend/main.py
"""
Point d'entrée principal de l'API FastAPI
"""
import sys
import os

# ⭐ AJOUTER LE CHEMIN DU DOSSIER COURANT POUR LES IMPORTS
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.api import (
    auth, candidats, competences, offres, entreprises, admin,
    fichiers, postes, contrats, candidatures, departements, employes,
    messagerie, notifications, messagerie_ws
)
from app.core.database import engine, Base, ensure_database_schema
import logging
import time
from datetime import datetime

# Configuration du logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Créer les tables si elles n'existent pas
try:
    logger.info("📦 Vérification des tables de la base de données...")
    ensure_database_schema()
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Tables vérifiées/créées avec succès")
except Exception as e:
    logger.error(f"❌ Erreur lors de la création des tables: {e}")

# Version de l'application
APP_VERSION = "1.0.0"

# Créer l'application FastAPI
app = FastAPI(
    title="SmartRecruit API",
    description="API pour la plateforme de recrutement intelligent SmartRecruit",
    version=APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)


# ⭐ CONFIGURATION CORS - registered early to ensure headers on all responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# ASGI middleware to ensure CORS headers are present on every response
class EnsureCorsHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get('origin')
        try:
            response = await call_next(request)
        except Exception as exc:
            if isinstance(exc, HTTPException):
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers={
                        'Access-Control-Allow-Origin': origin or '*',
                        'Access-Control-Allow-Credentials': 'true'
                    }
                )
            headers = {
                'Access-Control-Allow-Origin': origin or '*',
                'Access-Control-Allow-Credentials': 'true'
            }
            return JSONResponse(
                status_code=500,
                content={'detail': 'Erreur interne du serveur', 'error': str(exc) if settings.DEBUG else None},
                headers=headers
            )

        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        else:
            response.headers.setdefault('Access-Control-Allow-Origin', '*')
        return response

# Register the middleware as the outermost middleware to guarantee headers
app.add_middleware(EnsureCorsHeaderMiddleware)


# Middleware garantissant l'ajout des en-têtes CORS sur toutes les réponses,
# même en cas d'exception non gérée.
@app.middleware("http")
async def ensure_cors(request: Request, call_next):
    origin = request.headers.get('origin')
    try:
        response = await call_next(request)
    except Exception as e:
        if isinstance(e, HTTPException):
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers={
                    'Access-Control-Allow-Origin': origin or '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            )
        # Renvoie une réponse JSON compatible CORS
        headers = {
            'Access-Control-Allow-Origin': origin or (settings.ALLOWED_ORIGINS[0] if isinstance(settings.ALLOWED_ORIGINS, list) and settings.ALLOWED_ORIGINS else '*'),
            'Access-Control-Allow-Credentials': 'true'
        }
        return JSONResponse(status_code=500, content={
            'detail': 'Erreur interne du serveur',
            'error': str(e) if settings.DEBUG else None
        }, headers=headers)

    # Ajouter les headers CORS sur la réponse normale
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# ⭐ CONFIGURATION CORS (utiliser settings.ALLOWED_ORIGINS plutôt que '*')
# Determine allowed origins dynamically for development convenience
if getattr(settings, 'DEBUG', False):
    allow_origins = getattr(settings, 'ALLOWED_ORIGINS', ["http://localhost:5173"])
else:
    allow_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

# (CORS middleware moved earlier)

# ⭐ MIDDLEWARE DE LOGGING DES REQUÊTES (SÉCURISÉ ET NON-BLOQUANT)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logger toutes les requêtes HTTP sans bloquer la lecture du body"""
    start_time = time.time()
    
    # Log simple et propre sans consommer le stream réseau
    logger.info(f"📥 {request.method} {request.url.path}")
    
    # Traiter la requête
    try:
        response = await call_next(request)
        
        # Log de la réponse
        duration = (time.time() - start_time) * 1000
        status_emoji = "✅" if response.status_code < 400 else "⚠️" if response.status_code < 500 else "❌"
        logger.info(f"{status_emoji} {request.method} {request.url.path} → {response.status_code} ({duration:.2f}ms)")
        
        return response
    except Exception as e:
        logger.error(f"❌ Erreur dans le middleware: {e}")
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ {request.method} {request.url.path} → ERREUR ({duration:.2f}ms)")
        raise

# ⭐ MIDDLEWARE DE GESTION DES ERREURS
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Gérer les erreurs de validation"""
    logger.error(f"❌ Erreur de validation sur {request.url.path}: {exc.errors()}")
    origin = request.headers.get('origin') or (settings.ALLOWED_ORIGINS[0] if isinstance(settings.ALLOWED_ORIGINS, list) and settings.ALLOWED_ORIGINS else '*')
    headers = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Données invalides"
        },
        headers=headers
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Gérer les erreurs HTTP"""
    logger.warning(f"⚠️ {exc.status_code} sur {request.url.path}: {exc.detail}")
    origin = request.headers.get('origin') or (settings.ALLOWED_ORIGINS[0] if isinstance(settings.ALLOWED_ORIGINS, list) and settings.ALLOWED_ORIGINS else '*')
    headers = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail
        },
        headers=headers
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Gérer toutes les autres erreurs"""
    logger.error(f"❌ Erreur globale sur {request.url.path}: {str(exc)}")
    import traceback
    logger.error(traceback.format_exc())
    origin = request.headers.get('origin') or (settings.ALLOWED_ORIGINS[0] if isinstance(settings.ALLOWED_ORIGINS, list) and settings.ALLOWED_ORIGINS else '*')
    headers = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    content = {
        "detail": "Erreur interne du serveur",
        "error": str(exc) if settings.DEBUG else None
    }
    if settings.DEBUG:
        content["traceback"] = traceback.format_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
        headers=headers
    )

# (Removed duplicate CORSMiddleware block — a single, explicit CORS middleware
# is registered above to avoid conflicting header behavior.)

# ⭐ ROUTES PRINCIPALES
@app.get("/")
async def root():
    """Page d'accueil de l'API"""
    return {
        "message": "SmartRecruit API",
        "version": APP_VERSION,
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "docs": "/api/docs" if settings.DEBUG else None,
        "routes": {
            "auth": "/api/auth",
            "candidats": "/api/candidats",
            "entreprises": "/api/entreprises",
            "offres": "/api/offres",
            "candidatures": "/api/candidatures",
            "employes": "/api/employes",
            "departements": "/api/departements",
            "competences": "/api/competences",
            "postes": "/api/postes",
            "contrats": "/api/contrats",
            "fichiers": "/api/fichiers",
            "admin": "/api/admin"
        }
    }

# ⭐ ENDPOINT DE SANTÉ
@app.get("/health")
async def health_check():
    """Vérifier l'état de l'API"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": APP_VERSION
    }

# ⭐ ENDPOINT DE DIAGNOSTIC POUR LE TOKEN
@app.get("/api/debug/token")
async def debug_token(request: Request):
    """Endpoint de diagnostic pour vérifier le token"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return {
            "status": "no_token",
            "message": "Aucun token fourni",
            "headers": dict(request.headers)
        }
    
    token = auth_header.replace("Bearer ", "")
    
    try:
        from jose import jwt
        from app.core.config import settings
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return {
            "status": "valid",
            "payload": payload,
            "email": payload.get("sub"),
            "role": payload.get("role"),
            "expires": payload.get("exp")
        }
    except Exception as e:
        return {
            "status": "invalid",
            "error": str(e),
            "token": token[:20] + "..."
        }

# ⭐ INCLURE TOUS LES ROUTEURS
app.include_router(auth.router)
app.include_router(candidats.router)
app.include_router(competences.router)
app.include_router(offres.router)
app.include_router(entreprises.router)
app.include_router(admin.router)
app.include_router(fichiers.router)
app.include_router(postes.router)
app.include_router(contrats.router)
app.include_router(candidatures.router)
app.include_router(departements.router)
app.include_router(employes.router)
app.include_router(messagerie.router)
app.include_router(messagerie_ws.router)
app.include_router(notifications.router)

# ⭐ DÉMARRAGE
if __name__ == "__main__":
    import uvicorn
    logger.info(f"🚀 Démarrage de SmartRecruit API sur http://{settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )