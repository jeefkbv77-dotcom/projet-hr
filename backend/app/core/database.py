"""
Configuration de la base de données avec SQLAlchemy
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Créer le moteur de base de données
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=settings.DEBUG
    )

# Créer la session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
Base = declarative_base()


def ensure_database_schema():
    """Ajoute les colonnes et valeurs de schéma manquantes dans SQLite ou MySQL."""
    if not settings.DATABASE_URL.startswith(("sqlite", "mysql")):
        return

    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if engine.dialect.name == "mysql":
        with engine.begin() as connection:
            if "fichiers" in table_names:
                connection.execute(text(
                    "ALTER TABLE fichiers MODIFY type_fichier "
                    "ENUM('photo_profil','logo','photo_couverture','cv',"
                    "'lettre_motivation','portfolio','certificat','message','autre') NOT NULL"
                ))
                connection.execute(text(
                    "ALTER TABLE fichiers MODIFY categorie_proprietaire "
                    "ENUM('candidat','entreprise','employe','offre','message') NOT NULL"
                ))

            # Les anciennes tables ont été créées avec les noms d'Enum Python
            # (INDIVIDUEL/TEXT). Convertir les données avant de les relire.
            if "conversations" in table_names:
                connection.execute(text(
                    "ALTER TABLE conversations MODIFY type_conversation VARCHAR(32) NOT NULL"
                ))
                connection.execute(text(
                    "UPDATE conversations SET type_conversation = LOWER(type_conversation)"
                ))
                connection.execute(text(
                    "ALTER TABLE conversations MODIFY type_conversation "
                    "ENUM('individuel','groupe') NOT NULL"
                ))

            if "messages" in table_names:
                connection.execute(text(
                    "ALTER TABLE messages MODIFY type_message VARCHAR(32) NOT NULL"
                ))
                connection.execute(text(
                    "UPDATE messages SET type_message = LOWER(type_message)"
                ))
                connection.execute(text(
                    "ALTER TABLE messages MODIFY type_message "
                    "ENUM('text','image','video','audio','document','file','voice','other') NOT NULL"
                ))

    if engine.dialect.name == "mysql":
        return

    columns_to_add = {
        "statut_profil": "VARCHAR(50) NOT NULL DEFAULT 'candidat'",
        "date_embauche": "DATETIME NULL",
        "entreprise_actuelle_id": "INTEGER NULL",
        "derniere_activite": "DATETIME NULL",
        "est_en_ligne": "BOOLEAN NOT NULL DEFAULT 0",
        "photo_profil_url": "VARCHAR(255) NULL",
        "bio": "TEXT",
        "actif": "BOOLEAN NOT NULL DEFAULT 1",
        "date_modification": "DATETIME NULL",
    }

    if "employes" in inspector.get_table_names():
        employe_columns = {column["name"] for column in inspector.get_columns("employes")}
        if "entreprise_id" not in employe_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE employes ADD COLUMN entreprise_id INTEGER NULL"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_employes_entreprise_id ON employes (entreprise_id)"))

    if "utilisateurs" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("utilisateurs")}
    missing_columns = columns_to_add.keys() - existing_columns
    if not missing_columns:
        return

    with engine.begin() as connection:
        for column_name in missing_columns:
            connection.execute(text(
                f"ALTER TABLE utilisateurs ADD COLUMN {column_name} {columns_to_add[column_name]}"
            ))


ensure_sqlite_schema = ensure_database_schema


def get_db():
    """Dépendance pour obtenir la session de base de données"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
