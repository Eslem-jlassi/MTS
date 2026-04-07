# =============================================================================
# MTS TELECOM — MICROSERVICE DE DÉTECTION DE DOUBLONS (FastAPI)
# =============================================================================
"""
Point d'entrée du microservice de détection de doublons pour MTS Telecom.

ENDPOINTS :
  GET  /health             → État de santé du service + modèle
  POST /detect-duplicates  → Détection de doublons dans les tickets

ARCHITECTURE (JURY) :
  Ce microservice fait partie d'une architecture orientée services :

  ┌──────────┐  REST   ┌──────────────────┐  REST   ┌──────────────────┐
  │  React   │ ◀─────▶ │  Spring Boot     │ ──────▶ │  FastAPI         │
  │  Client  │         │  (port 8080)     │         │  Doublons        │
  │          │         │                  │         │  (port 8001)     │
  └──────────┘         └──────────────────┘         └──────────────────┘
                                │
                                │ REST
                                ▼
                       ┌──────────────────┐
                       │  FastAPI         │
                       │  Classification  │
                       │  (port 8000)     │
                       └──────────────────┘

  Quand un nouveau ticket est créé dans Spring Boot :
    1. Spring Boot récupère les tickets récents de la DB
    2. Spring Boot appelle POST /detect-duplicates avec le nouveau ticket
       + la liste des tickets récents
    3. Ce microservice encode les textes, calcule les similarités,
       et retourne les doublons potentiels
    4. Spring Boot affiche l'alerte dans l'interface

POURQUOI UN MICROSERVICE SÉPARÉ ? (JURY)
  → Le backend Java n'a pas les librairies NLP Python (SentenceTransformers)
  → Séparation des responsabilités : Java = métier, Python = IA
  → On peut upgrader le modèle IA sans toucher au backend
  → On peut scaler indépendamment (le NLP est plus gourmand en mémoire)
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import MODEL_NAME
from .schemas import DuplicateRequest, DuplicateResponse, HealthResponse
from .duplicate_detector import detect_duplicates, load_model, is_model_loaded, get_mode

# ─────────────────────────────────────────────────────────────────────────────
# Configuration du logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("mts-duplicate")


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan : chargement du modèle au démarrage
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie de l'application.
    Au démarrage → charge le modèle SentenceTransformers.
    """
    logger.info("=" * 60)
    logger.info("MTS TELECOM — Microservice Détection de Doublons")
    logger.info("=" * 60)

    model_loaded = load_model()
    mode = get_mode()
    if model_loaded:
        logger.info(f"Mode actif : {mode}")
        if mode == "tfidf":
            logger.info("Mode TF-IDF (SentenceTransformers non disponible) — qualité réduite")
        else:
            logger.info(f"Modèle '{MODEL_NAME}' chargé avec succès")
    else:
        logger.error("ERREUR CRITIQUE : Aucun modèle disponible !")

    logger.info("Service prêt sur http://localhost:8001")
    logger.info("=" * 60)

    yield

    logger.info("Arrêt du microservice de détection de doublons.")


# ─────────────────────────────────────────────────────────────────────────────
# Application FastAPI
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MTS Telecom — Détection de Doublons IA",
    description=(
        "Microservice de détection de tickets dupliqués utilisant "
        "SentenceTransformers et la similarité cosinus. "
        "Projet PFE MTS Telecom."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT : GET /health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Vérifie que le service est opérationnel et que le modèle est chargé.
    """
    mode = get_mode()
    return HealthResponse(
        status="healthy" if is_model_loaded() else "degraded",
        service="duplicate-detector",
        version="1.0.0",
        model_loaded=is_model_loaded(),
        model_name=MODEL_NAME if mode == "sentence-transformers" else f"tfidf-fallback ({mode})",
        mode=mode,
    )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT : POST /detect-duplicates
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/detect-duplicates", response_model=DuplicateResponse)
async def detect(request: DuplicateRequest):
    """
    Détecte les tickets potentiellement dupliqués ou similaires.

    Input :
      {
        "new_ticket": { "title": "Réseau lent", "description": "..." },
        "recent_tickets": [ { "id": 101, "title": "Lenteur réseau", ... }, ... ]
      }

    Output :
      {
        "is_duplicate": true,
        "possible_mass_incident": true,
        "duplicate_confidence": 0.92,
        "matched_tickets": [...],
        "reasoning": "...",
        "recommendation": "..."
      }

    Temps de réponse typique : 50-200ms selon le nombre de tickets.
    """
    if not is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="Aucun modèle disponible (ni SentenceTransformers, ni TF-IDF).",
        )

    start_time = time.time()

    try:
        result = detect_duplicates(request)
        elapsed = round((time.time() - start_time) * 1000, 1)
        result.latency_ms = elapsed
        logger.info(f"Détection terminée en {elapsed}ms — {len(result.matched_tickets)} match(es)")
        return result

    except Exception as e:
        logger.error(f"Erreur de détection : {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne : {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Lancement direct : python -m app.main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )
