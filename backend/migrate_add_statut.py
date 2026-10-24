from app.core.database import engine
from sqlalchemy import text

check_sql = text("SELECT COUNT(*) as c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'utilisateurs' AND column_name = 'statut_profil'")
add_sql = text("ALTER TABLE utilisateurs ADD COLUMN statut_profil VARCHAR(50) DEFAULT 'candidat'")

with engine.connect() as conn:
    res = conn.execute(check_sql).fetchone()
    count = res[0] if res is not None else 0
    if count == 0:
        print('Adding column statut_profil to utilisateurs...')
        conn.execute(add_sql)
        conn.commit()
        print('Column added')
    else:
        print('Column already present')

# Additional columns that may be missing in older DB dumps
additional_columns = {
    'entreprise_actuelle_id': "ALTER TABLE utilisateurs ADD COLUMN entreprise_actuelle_id INT NULL",
    'date_embauche': "ALTER TABLE utilisateurs ADD COLUMN date_embauche DATETIME NULL",
    'derniere_activite': "ALTER TABLE utilisateurs ADD COLUMN derniere_activite DATETIME NULL",
    'est_en_ligne': "ALTER TABLE utilisateurs ADD COLUMN est_en_ligne TINYINT(1) DEFAULT 0",
    'photo_profil_url': "ALTER TABLE utilisateurs ADD COLUMN photo_profil_url VARCHAR(255) NULL",
    'bio': "ALTER TABLE utilisateurs ADD COLUMN bio TEXT NULL",
    'actif': "ALTER TABLE utilisateurs ADD COLUMN actif TINYINT(1) DEFAULT 1",
    'date_creation': "ALTER TABLE utilisateurs ADD COLUMN date_creation DATETIME DEFAULT CURRENT_TIMESTAMP",
    'date_modification': "ALTER TABLE utilisateurs ADD COLUMN date_modification DATETIME NULL"
}

for col, sql_stmt in additional_columns.items():
    with engine.connect() as conn2:
        chk = conn2.execute(text("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'utilisateurs' AND column_name = :col"), {'col': col}).fetchone()
        if chk and chk[0] == 0:
            print(f"Adding column {col}...")
            conn2.execute(text(sql_stmt))
            conn2.commit()
            print(f"Column {col} added")
        else:
            print(f"Column {col} already present")