import pandas as pd
from pathlib import Path
import re

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

input_file = DATA_DIR / "incidents_synthetic.csv"
output_file = DATA_DIR / "incidents_dataset_rag.csv"

df = pd.read_csv(input_file)

print("Nombre initial d'incidents :", len(df))

BAD_TITLES = {
    "incident",
    "probleme",
    "test",
    "panne",
    "incident réseau"
}

BAD_ROOT_CAUSES = {
    "",
    "unknown",
    "n/a",
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

def good_title(title):
    t = title.lower()
    return len(t) >= 12 and t not in BAD_TITLES

def good_description(desc):
    return len(desc) >= 30

def good_root_cause(root):
    r = root.lower()
    return len(r) >= 12 and r not in BAD_ROOT_CAUSES

def useful_incident(row):
    workaround = row.get("workaround", "")
    final_resolution = row.get("final_resolution", "")
    return len(workaround) >= 12 or len(final_resolution) >= 12

mask = (
    df["title"].apply(good_title) &
    df["description"].apply(good_description) &
    df["root_cause"].apply(good_root_cause) &
    df.apply(useful_incident, axis=1)
)

rag_df = df[mask].copy()

rag_df.to_csv(output_file, index=False, encoding="utf-8-sig")

print("incidents_dataset_rag.csv créé :", output_file)
print("Nombre d'incidents RAG :", len(rag_df))

preview_cols = [c for c in ["incident_id", "title", "service_name", "severity", "status"] if c in rag_df.columns]
print(rag_df[preview_cols].head(10))