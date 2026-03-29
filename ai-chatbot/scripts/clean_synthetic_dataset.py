import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

input_file = DATA_DIR / "tickets_synthetic.csv"
output_file = DATA_DIR / "tickets_synthetic_clean.csv"

tickets = pd.read_csv(input_file)

print("Nombre initial de tickets synthétiques :", len(tickets))

# supprimer doublons exacts
tickets = tickets.drop_duplicates()

# nettoyer espaces
for col in tickets.columns:
    tickets[col] = tickets[col].fillna("").astype(str).str.strip()

tickets.to_csv(output_file, index=False, encoding="utf-8-sig")

print("tickets_synthetic_clean.csv créé :", output_file)
print("Nombre final de tickets synthétiques :", len(tickets))
print(tickets.head(5))