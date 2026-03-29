# =============================================================================
# MTS TELECOM — MICROSERVICE DE CLASSIFICATION DE TICKETS (FastAPI)
# =============================================================================
"""
Point d'entrée du microservice de classification IA pour MTS Telecom.

ENDPOINTS :
  GET  /health    → État de santé du service + modèle BERT
  POST /classify  → Classification complète d'un ticket
  POST /analyze   → Rétrocompatibilité avec l'ancien endpoint de sentiment

ARCHITECTURE (JURY) :
  Ce microservice fait partie d'une architecture orientée services :

  ┌──────────┐  HTTP/JSON  ┌──────────────────┐
  │  React   │ ◀─────────▶ │  Spring Boot     │
  │  Client  │             │  (port 8080)     │
  └──────────┘             └────────┬─────────┘
                                    │ REST call
                                    ▼
                           ┌──────────────────┐
                           │  FastAPI          │
                           │  Classification   │
                           │  (port 8000)      │
                           └──────────────────┘

  Le backend Spring Boot (ou le frontend React directement) envoie
  le titre et la description du ticket → reçoit la classification complète.
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import ClassificationRequest, ClassificationResponse, HealthResponse
from .classifier import classify_ticket, load_model, is_model_loaded

# ─────────────────────────────────────────────────────────────────────────────
# Configuration du logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("mts-classifier")


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan : chargement du modèle au démarrage
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie de l'application FastAPI.

    Au démarrage :
      → Tente de charger le modèle BERT
      → Si ça échoue, continue en mode dégradé (règles seules)

    Pourquoi lifespan et pas @app.on_event ? (JURY)
      → lifespan est la méthode recommandée par FastAPI 0.110+
      → Plus propre que on_event (deprecated)
      → Gère aussi le shutdown proprement
    """
    logger.info("=" * 60)
    logger.info("MTS TELECOM — Microservice Classification IA")
    logger.info("=" * 60)

    bert_loaded = load_model()
    if bert_loaded:
        logger.info("Mode : HYBRIDE (BERT + Règles)")
    else:
        logger.info("Mode : RÈGLES SEULES (BERT non disponible)")
        logger.info("Pour activer BERT : pip install transformers torch")

    logger.info("Service prêt sur http://localhost:8000")
    logger.info("=" * 60)

    yield  # L'application tourne ici

    logger.info("Arrêt du microservice de classification.")


# ─────────────────────────────────────────────────────────────────────────────
# Application FastAPI
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MTS Telecom — Classification IA de Tickets",
    description=(
        "Microservice de classification automatique des tickets de support "
        "utilisant une approche hybride : BERT (sentiment) + Règles métier "
        "(catégorie, service, urgence). Projet PFE MTS Telecom."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS — Autoriser les appels depuis React (port 3000) et Spring Boot (8080)
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
    Vérifie que le service est opérationnel.

    Retourne :
      - status : "healthy"
      - model_loaded : true/false (BERT disponible ?)
      - mode : "hybrid" ou "rules_only"

    Utilisé par :
      - Spring Boot (actuator check)
      - React (sentimentService.healthCheck())
      - Docker healthcheck
    """
    return HealthResponse(
        status="healthy",
        model_loaded=is_model_loaded(),
        mode="hybrid" if is_model_loaded() else "rules_only",
        version="2.0.0",
    )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT : POST /classify
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/classify", response_model=ClassificationResponse)
async def classify(request: ClassificationRequest):
    """
    Classifie un ticket de support.

    Input :
      {
        "title": "Réseau très lent depuis ce matin",
        "description": "Tous les services sont impactés, c'est urgent !"
      }

    Output :
      {
        "category": "LATENCE",
        "priority": "HIGH",
        "service": "CORE_NETWORK",
        "urgency": "ELEVATED",
        "sentiment": "NEGATIVE",
        "criticality": "HIGH",
        "confidence": 0.82,
        "reasoning": "3 mot(s)-clé(s) catégorie détecté(s). ..."
      }

    Temps de réponse :
      - Avec BERT : ~200-500ms
      - Sans BERT : ~5-20ms
    """
    start_time = time.time()

    try:
        result = classify_ticket(request)
        elapsed = round((time.time() - start_time) * 1000, 1)
        logger.info(f"Classification terminée en {elapsed}ms")
        return result

    except Exception as e:
        logger.error(f"Erreur de classification : {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne de classification : {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT : POST /analyze (rétrocompatibilité)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_legacy(request: ClassificationRequest):
    """
    Endpoint de rétrocompatibilité avec l'ancien microservice de sentiment.

    Le frontend existant appelle /analyze → on redirige vers /classify
    pour ne rien casser pendant la migration.

    Retourne le même format que /classify + les anciens champs pour
    garder la compatibilité avec sentimentService.ts.
    """
    result = await classify(request)

    # Mapper vers l'ancien format attendu par le frontend
    sentiment_map = {
        "NEGATIVE": "NEGATIF",
        "POSITIVE": "POSITIF",
        "NEUTRAL": "NEUTRE",
    }

    return {
        # Nouveaux champs (classification complète)
        **result.model_dump(),
        # Anciens champs (rétrocompatibilité sentimentService.ts)
        "sentiment": sentiment_map.get(result.sentiment, result.sentiment),
        "score": result.confidence,
        "label": result.category,
        "details": result.reasoning,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Lancement direct : python -m app.main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
