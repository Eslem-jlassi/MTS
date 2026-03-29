import pandas as pd
from pathlib import Path
import re

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

input_file = DATA_DIR / "tickets_dataset_final.csv"
output_file = DATA_DIR / "tickets_dataset_rag.csv"

df = pd.read_csv(input_file)

print("Nombre initial de tickets finaux :", len(df))

# titres à exclure
BAD_TITLES = {
    "panne reseau",
    "reseau lent",
    "reseau tres lent",
    "wifi lent",
    "wifi tres lent",
    "probleme",
    "test"
}

BAD_RESOLUTIONS = {
    "g",
    "ok",
    "done",
    "resolved",
    "c'etait facile a reegler",
    "resolution totaale",
    "votre ticket est bien résolu"
}

BAD_COMPANIES = {
    "",
    "tunis",
    "sfax",
    "sousse",
    "none",
    "null"
}

def clean_text(value):
    if pd.isna(value):
        return ""
    value = str(value).strip()
    value = re.sub(r"\s+", " ", value)
    return value

for col in df.columns:
    df[col] = df[col].apply(clean_text)

def is_good_title(title):
    t = title.lower()
    return len(t) >= 12 and t not in BAD_TITLES

def is_good_description(desc):
    return len(desc) >= 30

def is_good_company(company):
    return company.lower() not in BAD_COMPANIES

def is_good_resolved_ticket(row):
    status = row.get("status", "").upper()
    resolution = row.get("resolution", "").lower()
    if status in {"RESOLVED", "CLOSED"}:
        if len(resolution) < 12 or resolution in BAD_RESOLUTIONS:
            return False
    return True

def has_useful_context(row):
    comments = row.get("comments_summary", "")
    root = row.get("root_cause", "")
    resolution = row.get("resolution", "")
    return any(len(x) >= 12 for x in [comments, root, resolution])

mask = (
    df["title"].apply(is_good_title) &
    df["description"].apply(is_good_description) &
    df["company_name"].apply(is_good_company) &
    df.apply(is_good_resolved_ticket, axis=1) &
    df.apply(has_useful_context, axis=1)
)

rag_df = df[mask].copy()

rag_df.to_csv(output_file, index=False, encoding="utf-8-sig")

print("tickets_dataset_rag.csv créé :", output_file)
print("Nombre de tickets RAG :", len(rag_df))
print(rag_df[["ticket_number", "title", "status", "service_name", "company_name"]].head(15))