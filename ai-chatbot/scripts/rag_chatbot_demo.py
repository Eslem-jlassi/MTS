import pickle
from pathlib import Path

import faiss
from sentence_transformers import SentenceTransformer

INDEX_DIR = Path(__file__).resolve().parent.parent / "index"

index_file = INDEX_DIR / "rag_faiss.index"
meta_file = INDEX_DIR / "rag_metadata.pkl"

print("Chargement de l'index FAISS...")
index = faiss.read_index(str(index_file))

print("Chargement des métadonnées...")
with open(meta_file, "rb") as f:
    metadata = pickle.load(f)

print("Chargement du modèle d'embeddings...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def clean_extracted(value: str) -> str:
    if not value:
        return ""
    value = str(value).strip()
    if value.lower() == "nan":
        return ""
    return value


def extract_field(text: str, field_name: str):
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(field_name):
            value = line.replace(field_name, "", 1).strip()
            return clean_extracted(value)
    return ""


def build_answer(query, results):
    if not results:
        return "Je n’ai trouvé aucun cas similaire dans la base de connaissances."

    top = results[0]
    content = top.get("content", "")

    root_cause = extract_field(content, "Root Cause:")
    resolution = extract_field(content, "Resolution:")
    workaround = extract_field(content, "Workaround:")
    final_resolution = extract_field(content, "Final Resolution:")

    lines = []
    lines.append(f"Question utilisateur : {query}\n")
    lines.append("Réponse du chatbot :")
    lines.append(f"- Un cas similaire a été identifié sur le service : {top.get('service_name', 'N/A')}")
    lines.append(f"- Titre le plus pertinent : {top.get('title', 'N/A')}")

    if root_cause:
        lines.append(f"- Cause probable : {root_cause}")

    if resolution:
        lines.append(f"- Solution / action recommandée : {resolution}")

    if workaround:
        lines.append(f"- Contournement possible : {workaround}")

    if final_resolution and final_resolution != resolution:
        lines.append(f"- Résolution finale connue : {final_resolution}")

    lines.append("\nDocuments similaires retrouvés :")
    for i, doc in enumerate(results, start=1):
        lines.append(
            f"{i}. [{doc.get('doc_type', '')}] {doc.get('title', '')} "
            f"(service: {doc.get('service_name', '')}, score: {doc.get('score', 0):.4f})"
        )

    return "\n".join(lines)


while True:
    query = input("\nEntrez votre question (ou 'exit') : ").strip()
    if query.lower() == "exit":
        break

    query_embedding = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True
    ).astype("float32")

    top_k = 5
    scores, indices = index.search(query_embedding, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        doc = metadata[idx].copy()
        doc["score"] = float(score)
        results.append(doc)

    answer = build_answer(query, results)
    print("\n" + "=" * 80)
    print(answer)
    print("=" * 80)