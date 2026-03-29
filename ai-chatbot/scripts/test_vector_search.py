import pickle
from pathlib import Path

import faiss
import numpy as np
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

    print("\nTop résultats :\n")
    for rank, (score, idx) in enumerate(zip(scores[0], indices[0]), start=1):
        doc = metadata[idx]
        print(f"{rank}. [{doc.get('doc_type', '')}] {doc.get('title', '')}")
        print(f"   Service : {doc.get('service_name', '')}")
        print(f"   Langue  : {doc.get('language', '')}")
        print(f"   Score   : {score:.4f}")
        print(f"   Doc ID  : {doc.get('doc_id', '')}")
        print()