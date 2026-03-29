import pandas as pd
import pymysql
from pathlib import Path

# =========================
# CONFIG MYSQL
# =========================
DB_HOST = "localhost"
DB_PORT = 3306
DB_NAME = "mts_telecom_db"
DB_USER = "root"
DB_PASSWORD = "Root123!"   # Mets ton vrai mot de passe MySQL si nécessaire

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# =========================
# CONNEXION MYSQL
# =========================
conn = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    charset="utf8mb4"
)

print("Connexion MySQL réussie.")

# =========================
# 1) EXPORT TICKETS
# =========================
tickets_query = """
SELECT
    t.id AS ticket_id,
    t.ticket_number,
    t.title,
    t.description,
    t.category,
    t.priority,
    t.status,
    s.name AS service_name,
    CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
    c.client_code,
    COALESCE(c.company_name, comp.name) AS company_name,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.resolution,
    t.root_cause
FROM tickets t
LEFT JOIN services s ON t.service_id = s.id
LEFT JOIN users u ON t.created_by = u.id
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN companies comp ON c.company_id = comp.id
"""

tickets_df = pd.read_sql(tickets_query, conn)
tickets_df.to_csv(OUTPUT_DIR / "tickets_raw.csv", index=False, encoding="utf-8-sig")
print("tickets_raw.csv créé.")

# =========================
# 2) EXPORT COMMENTS
# =========================
comments_query = """
SELECT
    tc.id AS comment_id,
    tc.ticket_id,
    tc.content,
    tc.is_internal,
    tc.created_at,
    CONCAT(u.first_name, ' ', u.last_name) AS author_name
FROM ticket_comments tc
LEFT JOIN users u ON tc.author_id = u.id
"""

comments_df = pd.read_sql(comments_query, conn)
comments_df.to_csv(OUTPUT_DIR / "ticket_comments_raw.csv", index=False, encoding="utf-8-sig")
print("ticket_comments_raw.csv créé.")

# =========================
# 3) EXPORT INCIDENTS
# =========================
incidents_query = """
SELECT
    i.id AS incident_id,
    i.incident_number,
    i.title,
    i.description,
    i.severity,
    i.impact,
    i.status,
    s.name AS service_name,
    i.started_at,
    i.resolved_at,
    i.cause,
    i.post_mortem
FROM incidents i
LEFT JOIN services s ON i.service_id = s.id
"""

incidents_df = pd.read_sql(incidents_query, conn)
incidents_df.to_csv(OUTPUT_DIR / "incidents_raw.csv", index=False, encoding="utf-8-sig")
print("incidents_raw.csv créé.")

# =========================
# 4) EXPORT SERVICES
# =========================
services_query = """
SELECT
    id,
    name,
    category,
    description,
    status,
    criticality,
    availability_pct,
    avg_latency_ms,
    mttr_minutes,
    created_at
FROM services
"""

services_df = pd.read_sql(services_query, conn)
services_df.to_csv(OUTPUT_DIR / "services_raw.csv", index=False, encoding="utf-8-sig")
print("services_raw.csv créé.")

conn.close()
print("Export terminé avec succès.")