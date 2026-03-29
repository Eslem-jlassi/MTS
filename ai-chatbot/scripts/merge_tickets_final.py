import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

real_file = DATA_DIR / "tickets_dataset_clean.csv"
synthetic_file = DATA_DIR / "tickets_synthetic_clean.csv"
final_file = DATA_DIR / "tickets_dataset_final.csv"

real_df = pd.read_csv(real_file)
synthetic_df = pd.read_csv(synthetic_file)

print("Tickets réels propres :", len(real_df))
print("Tickets synthétiques propres :", len(synthetic_df))

# retirer usefulness_score si présent
for df in [real_df, synthetic_df]:
    if "usefulness_score" in df.columns:
        df.drop(columns=["usefulness_score"], inplace=True)

# harmoniser les colonnes communes
common_cols = [c for c in real_df.columns if c in synthetic_df.columns]
real_df = real_df[common_cols].copy()
synthetic_df = synthetic_df[common_cols].copy()

# fusion
final_df = pd.concat([real_df, synthetic_df], ignore_index=True)

# suppression doublons sur ticket_number
if "ticket_number" in final_df.columns:
    final_df = final_df.drop_duplicates(subset=["ticket_number"], keep="first")

# nettoyage final
for col in final_df.columns:
    final_df[col] = final_df[col].fillna("").astype(str).str.strip()

final_df.to_csv(final_file, index=False, encoding="utf-8-sig")

print("tickets_dataset_final.csv créé :", final_file)
print("Nombre total de tickets finaux :", len(final_df))
print(final_df.head(10))