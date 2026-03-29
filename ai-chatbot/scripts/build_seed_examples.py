import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

input_file = DATA_DIR / "tickets_dataset_clean.csv"
output_file = DATA_DIR / "tickets_seed_examples.csv"

df = pd.read_csv(input_file)

# On retire usefulness_score du dataset d'exemple si présent
if "usefulness_score" in df.columns:
    df = df.drop(columns=["usefulness_score"])

# Règles qualité plus strictes
def good_title(title: str) -> bool:
    title = str(title).strip().lower()
    bad_titles = {
        "panne reseau", "reseau lent", "reseau tres lent",
        "wifi lent", "wifi tres lent", "probleme", "test"
    }
    return len(title) >= 12 and title not in bad_titles

def good_description(desc: str) -> bool:
    desc = str(desc).strip()
    return len(desc) >= 30

def good_resolution(resolution: str, status: str) -> bool:
    resolution = str(resolution).strip().lower()
    status = str(status).strip().upper()
    if status in {"RESOLVED", "CLOSED"}:
        if len(resolution) < 12:
            return False
        if resolution in {"g", "ok", "done", "resolved", "c'etait facile a reegler"}:
            return False
    return True

def good_company(company: str) -> bool:
    company = str(company).strip().lower()
    bad_values = {"", "tunis", "sfax", "sousse", "null", "none"}
    return company not in bad_values

mask = (
    df["title"].apply(good_title) &
    df["description"].apply(good_description) &
    df.apply(lambda row: good_resolution(row.get("resolution", ""), row.get("status", "")), axis=1) &
    df["company_name"].apply(good_company)
)

seed_df = df[mask].copy()

# Limiter aux meilleurs exemples existants
seed_df = seed_df.head(10)

seed_df.to_csv(output_file, index=False, encoding="utf-8-sig")

print("tickets_seed_examples.csv créé :", output_file)
print("Nombre d'exemples gardés :", len(seed_df))
print(seed_df[["ticket_number", "title", "status", "service_name", "company_name"]])