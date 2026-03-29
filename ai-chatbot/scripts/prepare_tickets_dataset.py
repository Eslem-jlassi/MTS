import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# =========================
# Charger les fichiers bruts
# =========================
tickets = pd.read_csv(DATA_DIR / "tickets_raw.csv")
comments = pd.read_csv(DATA_DIR / "ticket_comments_raw.csv")

print("Tickets chargés :", len(tickets))
print("Commentaires chargés :", len(comments))

# =========================
# Résumer les commentaires par ticket
# =========================
if not comments.empty and "ticket_id" in comments.columns and "content" in comments.columns:
    comments_grouped = (
        comments.groupby("ticket_id")["content"]
        .apply(lambda x: " | ".join([str(v).strip() for v in x if pd.notna(v) and str(v).strip() != ""]))
        .reset_index()
        .rename(columns={"content": "comments_summary"})
    )
else:
    comments_grouped = pd.DataFrame(columns=["ticket_id", "comments_summary"])

# =========================
# Fusionner tickets + résumé commentaires
# =========================
tickets = tickets.merge(comments_grouped, on="ticket_id", how="left")

# =========================
# Détection simple de langue
# =========================
def detect_language(row):
    text = f"{row.get('title', '')} {row.get('description', '')}".lower()
    english_keywords = [
        "error", "issue", "failed", "unable", "service unavailable",
        "slow", "network issue", "login problem", "timeout"
    ]
    for word in english_keywords:
        if word in text:
            return "en"
    return "fr"

tickets["language"] = tickets.apply(detect_language, axis=1)

# =========================
# Nettoyage des colonnes texte
# =========================
text_columns = [
    "title",
    "description",
    "category",
    "priority",
    "status",
    "service_name",
    "company_name",
    "resolution",
    "root_cause",
    "comments_summary"
]

for col in text_columns:
    if col in tickets.columns:
        tickets[col] = tickets[col].fillna("").astype(str).str.strip()

# =========================
# Colonnes finales du dataset chatbot
# =========================
final_columns = [
    "ticket_id",
    "ticket_number",
    "title",
    "description",
    "category",
    "priority",
    "status",
    "service_name",
    "company_name",
    "created_at",
    "resolved_at",
    "resolution",
    "root_cause",
    "comments_summary",
    "language"
]

# garder uniquement les colonnes qui existent réellement
final_columns_existing = [col for col in final_columns if col in tickets.columns]

tickets_final = tickets[final_columns_existing].copy()

# =========================
# Sauvegarde
# =========================
output_file = DATA_DIR / "tickets_dataset.csv"
tickets_final.to_csv(output_file, index=False, encoding="utf-8-sig")

print(f"tickets_dataset.csv créé avec succès : {output_file}")
print("Nombre total de tickets dans le dataset :", len(tickets_final))
print("\nAperçu :")
print(tickets_final.head(5))