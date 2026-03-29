import json
import pickle
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
INDEX_DIR = Path(__file__).resolve().parent.parent / "index"
INDEX_DIR.mkdir(parents=True,  exist_ok=True)

docs_file = DATA_DIR / "rag_documents.jsonl"
index_file = INDEX_DIR / "rag_faiss.index"
meta_file = INDEX_DIR / "rag_metadata.pkl"

print("Chargement des documents...")
documents = []
with open(docs_file, "r", encoding="utf-8") as f:
    for line in f:
        documents.append(json.loads(line))

print("Nombre de documents :", len(documents))

texts = [doc["content"] for doc in documents]

print("Chargement du modèle d'embeddings...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

print("Création des embeddings...")
embeddings = model.encode(
    texts,
    show_progress_bar=True,
    convert_to_numpy=True,
    normalize_embeddings=True
)

print("Dimension embeddings :", embeddings.shape[1])

index = faiss.IndexFlatIP(embeddings.shape[1])
index.add(embeddings.astype("float32"))

faiss.write_index(index, str(index_file))

with open(meta_file, "wb") as f:
    pickle.dump(documents, f)

print("Index FAISS créé :", index_file)
print("Métadonnées créées :", meta_file)
print("Nombre de vecteurs indexés :", index.ntotal)