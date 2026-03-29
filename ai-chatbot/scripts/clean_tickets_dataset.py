import pandas as pd
from pathlib import Path
import re

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

input_file = DATA_DIR / "tickets_dataset.csv"
clean_file = DATA_DIR / "tickets_dataset_clean.csv"
rejected_file = DATA_DIR / "tickets_rejected.csv"

df = pd.read_csv(input_file)

print("Nombre initial de tickets :", len(df))

# =========================
# Fonctions utilitaires
# =========================
def normalize_text(text):
    if pd.isna(text):
        return ""
    text = str(text).strip()
    text = re.sub(r"\s+", " ", text)
    return text

def is_meaningful_text(text):
    text = normalize_text(text)
    if len(text) < 8:
        return False
    # au moins une espace ou plusieurs mots
    if len(text.split()) < 2:
        return False
    # éviter texte bizarre
    if re.fullmatch(r"[A-Z0-9_-]+", text) and len(text) < 15:
        return False
    return True

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
    "comments_summary",
    "language"
]

for col in text_columns:
    if col in df.columns:
        df[col] = df[col].apply(normalize_text)

# =========================
# Règles de filtrage
# =========================
conditions_valid = (
    df["title"].apply(is_meaningful_text) &
    df["description"].apply(lambda x: len(normalize_text(x)) >= 15) &
    df["service_name"].apply(lambda x: len(normalize_text(x)) >= 3)
)

# =========================
# Séparer les bons et mauvais tickets
# =========================
df_clean = df[conditions_valid].copy()
df_rejected = df[~conditions_valid].copy()

# =========================
# Optionnel : garder d'abord les tickets les plus utiles
# =========================
useful_status = ["RESOLVED", "CLOSED", "ESCALATED", "IN_PROGRESS", "OPEN"]
if "status" in df_clean.columns:
    df_clean = df_clean[df_clean["status"].isin(useful_status)].copy()

# =========================
# Ajouter un score simple d'utilité
# =========================
def usefulness_score(row):
    score = 0
    if len(row.get("title", "")) > 10:
        score += 1
    if len(row.get("description", "")) > 30:
        score += 1
    if len(row.get("resolution", "")) > 10:
        score += 1
    if len(row.get("comments_summary", "")) > 10:
        score += 1
    if len(row.get("root_cause", "")) > 5:
        score += 1
    return score

df_clean["usefulness_score"] = df_clean.apply(usefulness_score, axis=1)

# garder les tickets les plus informatifs d'abord
df_clean = df_clean.sort_values(by="usefulness_score", ascending=False)

# =========================
# Sauvegarde
# =========================
df_clean.to_csv(clean_file, index=False, encoding="utf-8-sig")
df_rejected.to_csv(rejected_file, index=False, encoding="utf-8-sig")

print("tickets_dataset_clean.csv créé :", clean_file)
print("tickets_rejected.csv créé :", rejected_file)
print("Nombre tickets propres :", len(df_clean))
print("Nombre tickets rejetés :", len(df_rejected))

print("\nAperçu dataset propre :")
print(df_clean.head(10)[["ticket_number", "title", "status", "service_name", "usefulness_score"]])