import pandas as pd
from pathlib import Path
import json

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

tickets_file = DATA_DIR / "tickets_dataset_rag.csv"
incidents_file = DATA_DIR / "incidents_dataset_rag.csv"

output_jsonl = DATA_DIR / "rag_documents.jsonl"
output_csv = DATA_DIR / "rag_documents.csv"

tickets_df = pd.read_csv(tickets_file)
incidents_df = pd.read_csv(incidents_file)

print("Tickets RAG :", len(tickets_df))
print("Incidents RAG :", len(incidents_df))

documents = []

# =========================
# Documents issus des tickets
# =========================
for _, row in tickets_df.iterrows():
    doc_id = f"ticket_{row.get('ticket_id', '')}"

    content = f"""
Type: Ticket
Ticket Number: {row.get('ticket_number', '')}
Service: {row.get('service_name', '')}
Company: {row.get('company_name', '')}
Title: {row.get('title', '')}
Description: {row.get('description', '')}
Category: {row.get('category', '')}
Priority: {row.get('priority', '')}
Status: {row.get('status', '')}
Root Cause: {row.get('root_cause', '')}
Resolution: {row.get('resolution', '')}
Comments: {row.get('comments_summary', '')}
Language: {row.get('language', '')}
""".strip()

    documents.append({
        "doc_id": doc_id,
        "doc_type": "ticket",
        "source_id": row.get("ticket_id", ""),
        "service_name": row.get("service_name", ""),
        "company_name": row.get("company_name", ""),
        "language": row.get("language", ""),
        "title": row.get("title", ""),
        "content": content
    })

# =========================
# Documents issus des incidents
# =========================
for _, row in incidents_df.iterrows():
    doc_id = f"incident_{row.get('incident_id', '')}"

    content = f"""
Type: Incident
Service: {row.get('service_name', '')}
Title: {row.get('title', '')}
Description: {row.get('description', '')}
Severity: {row.get('severity', '')}
Status: {row.get('status', '')}
Root Cause: {row.get('root_cause', '')}
Workaround: {row.get('workaround', '')}
Final Resolution: {row.get('final_resolution', '')}
Language: {row.get('language', '')}
""".strip()

    documents.append({
        "doc_id": doc_id,
        "doc_type": "incident",
        "source_id": row.get("incident_id", ""),
        "service_name": row.get("service_name", ""),
        "company_name": "",
        "language": row.get("language", ""),
        "title": row.get("title", ""),
        "content": content
    })

# =========================
# Sauvegarde JSONL
# =========================
with open(output_jsonl, "w", encoding="utf-8") as f:
    for doc in documents:
        f.write(json.dumps(doc, ensure_ascii=False) + "\n")

# =========================
# Sauvegarde CSV
# =========================
docs_df = pd.DataFrame(documents)
docs_df.to_csv(output_csv, index=False, encoding="utf-8-sig")

print("rag_documents.jsonl créé :", output_jsonl)
print("rag_documents.csv créé :", output_csv)
print("Nombre total de documents RAG :", len(documents))
print(docs_df.head(5)[["doc_id", "doc_type", "service_name", "title"]])