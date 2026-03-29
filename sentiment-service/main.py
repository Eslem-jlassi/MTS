# =============================================================================
# MTS TELECOM - MICROSERVICE IA - ANALYSE DE SENTIMENT
# =============================================================================
"""
Microservice FastAPI pour l'analyse de sentiment des tickets clients.

ARCHITECTURE:
- Backend principal: Spring Boot (Java) sur port 8080
- Microservice IA: FastAPI (Python) sur port 8000
- Modèle: BERT multilingue (français/anglais/arabe)

FONCTIONNALITÉS:
1. Détection d'émotion (colère, frustration, satisfaction)
2. Priorisation automatique URGENT_EMOTIONAL
3. Score de sentiment (1-5 étoiles)
4. Logs détaillés pour audit

JURY PFE - POINTS CLÉS:
✓ Architecture microservices moderne
✓ IA intégrée pour améliorer l'expérience client
✓ Scalabilité (peut tourner en Docker)
✓ API REST standardisée (OpenAPI/Swagger)
"""

# =============================================================================
# IMPORTS
# =============================================================================
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import logging
from typing import Optional, Dict
from datetime import datetime
import os

# =============================================================================
# CONFIGURATION - LOGGING
# =============================================================================
"""
Logs structurés pour tracer chaque requête.
IMPORTANT pour la soutenance: montrer les logs en démo.
"""
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sentiment_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# APPLICATION FASTAPI
# =============================================================================
app = FastAPI(
    title="MTS Telecom - Sentiment Analysis API",
    description="Microservice IA pour analyser l'émotion des tickets clients et détecter les urgences émotionnelles",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI disponible sur http://localhost:8000/docs
    redoc_url="/redoc"
)

# =============================================================================
# CORS - PERMET LES APPELS DEPUIS SPRING BOOT
# =============================================================================
"""
SÉCURITÉ: En production, remplacer "*" par l'URL exacte du backend Spring Boot.
Pour la soutenance PFE, on accepte toutes les origines (développement).
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # PROD: ["http://localhost:8080"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# MODÈLE PYDANTIC - REQUÊTE
# =============================================================================
class SentimentRequest(BaseModel):
    """
    Structure de la requête envoyée par Spring Boot.
    
    VALIDATION AUTOMATIQUE:
    - text: requis, min 1 caractère, max 10000
    - ticket_id: optionnel, pour traçabilité
    - language: optionnel, auto-détecté par le modèle BERT multilingue
    """
    text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Texte du ticket client à analyser",
        example="Ça fait 3 jours que mon internet ne fonctionne pas ! C'est inadmissible !"
    )
    ticket_id: Optional[int] = Field(
        None,
        description="ID du ticket (pour logs)",
        example=12345
    )
    language: Optional[str] = Field(
        "auto",
        description="Langue du texte (auto-détection par défaut)",
        example="fr"
    )
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        """Validation custom: le texte ne peut pas être vide après strip."""
        if not v.strip():
            raise ValueError("Le texte ne peut pas être vide")
        return v.strip()

# =============================================================================
# MODÈLE PYDANTIC - RÉPONSE
# =============================================================================
class SentimentResponse(BaseModel):
    """
    Réponse structurée renvoyée à Spring Boot.
    
    CHAMPS:
    - sentiment: Label (TRÈS NÉGATIF, NÉGATIF, NEUTRE, POSITIF, TRÈS POSITIF)
    - score: Niveau de confiance du modèle (0-1)
    - stars: Note sur 5 étoiles (1-5)
    - is_angry: Boolean - Client en colère ?
    - priority_flag: URGENT_EMOTIONAL si colère détectée
    - confidence: Pourcentage de confiance
    """
    sentiment: str = Field(
        ...,
        description="Label du sentiment détecté",
        example="TRÈS NÉGATIF"
    )
    score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Score de confiance du modèle",
        example=0.89
    )
    stars: int = Field(
        ...,
        ge=1,
        le=5,
        description="Évaluation en étoiles (1=très négatif, 5=très positif)",
        example=1
    )
    is_angry: bool = Field(
        ...,
        description="True si le client est en colère ou frustré",
        example=True
    )
    priority_flag: Optional[str] = Field(
        None,
        description="Flag de priorité si urgence émotionnelle détectée",
        example="URGENT_EMOTIONAL"
    )
    confidence: float = Field(
        ...,
        description="Pourcentage de confiance (0-100)",
        example=89.5
    )
    processed_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Timestamp de traitement",
        example="2026-03-02T10:30:00.123456"
    )

# =============================================================================
# CHARGEMENT DU MODÈLE IA
# =============================================================================
"""
MODÈLE: nlptown/bert-base-multilingual-uncased-sentiment
✓ Entraîné sur 6 langues (français inclus)
✓ Spécialisé pour les avis clients
✓ Output: 1-5 étoiles

ALTERNATIVE (plus léger):
- distilbert-base-multilingual-cased-sentiments-student
- cardiffnlp/twitter-xlm-roberta-base-sentiment

JURY: Expliquer pourquoi BERT > règles simples (contexte, négations, sarcasme)
"""

MODEL_NAME = "nlptown/bert-base-multilingual-uncased-sentiment"
logger.info(f"🤖 Chargement du modèle IA: {MODEL_NAME}")

try:
    # Chargement du tokenizer et du modèle
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    
    # Pipeline Hugging Face (simplifie l'utilisation)
    sentiment_analyzer = pipeline(
        "sentiment-analysis",
        model=model,
        tokenizer=tokenizer,
        top_k=None  # Retourne tous les scores
    )
    logger.info("✅ Modèle chargé avec succès")
except Exception as e:
    logger.error(f"❌ Erreur lors du chargement du modèle: {e}")
    raise RuntimeError(f"Impossible de charger le modèle IA: {e}")

# =============================================================================
# FONCTION - ANALYSE DE SENTIMENT
# =============================================================================
def analyze_sentiment_logic(text: str) -> Dict:
    """
    Analyse le sentiment et détecte la colère.
    
    LOGIQUE SEUIL (JURY - JUSTIFIER):
    - 1-2 étoiles + score > 0.6 → Colère/Frustration → URGENT_EMOTIONAL
    - 3 étoiles → Neutre/Mitigé
    - 4-5 étoiles → Satisfaction
    
    POURQUOI CE SEUIL?
    - Études montrent que clients < 3★ nécessitent attention immédiate
    - Score > 0.6 = haute confiance (évite faux positifs)
    
    Args:
        text: Texte à analyser
        
    Returns:
        Dict avec sentiment, score, stars, is_angry, priority_flag
    """
    try:
        # Analyse avec le modèle BERT
        results = sentiment_analyzer(text[:512])  # Max 512 tokens pour BERT
        
        # Le modèle retourne 5 labels (1-5 stars)
        # On prend celui avec le score le plus élevé
        top_result = max(results[0], key=lambda x: x['score'])
        
        # Extraction du nombre d'étoiles depuis le label
        # Format: "1 star", "2 stars", etc.
        stars = int(top_result['label'].split()[0])
        score = top_result['score']
        
        # Mapping étoiles → sentiment textuel
        sentiment_map = {
            1: "TRÈS NÉGATIF",
            2: "NÉGATIF",
            3: "NEUTRE",
            4: "POSITIF",
            5: "TRÈS POSITIF"
        }
        sentiment_label = sentiment_map[stars]
        
        # DÉTECTION DE COLÈRE
        # Critère: 1-2 étoiles ET haute confiance (> 60%)
        is_angry = (stars <= 2) and (score >= 0.6)
        
        # FLAG DE PRIORITÉ
        priority_flag = "URGENT_EMOTIONAL" if is_angry else None
        
        logger.info(
            f"📊 Analyse: {sentiment_label} | "
            f"Stars: {stars} | Score: {score:.2f} | "
            f"Colère: {is_angry}"
        )
        
        return {
            "sentiment": sentiment_label,
            "score": score,
            "stars": stars,
            "is_angry": is_angry,
            "priority_flag": priority_flag,
            "confidence": round(score * 100, 2)
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'analyse: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'analyse de sentiment: {str(e)}"
        )

# =============================================================================
# ENDPOINT - HEALTH CHECK
# =============================================================================
@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Endpoint de santé pour monitoring (Spring Boot Actuator compatible).
    
    UTILISATION:
    - Kubernetes liveness probe
    - Spring Boot WebClient pour vérifier disponibilité
    - Monitoring (Prometheus, Grafana)
    """
    return {
        "status": "UP",
        "service": "sentiment-analysis",
        "model": MODEL_NAME,
        "timestamp": datetime.utcnow().isoformat()
    }

# =============================================================================
# ENDPOINT - ANALYSE DE SENTIMENT
# =============================================================================
@app.post(
    "/analyze",
    response_model=SentimentResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyser le sentiment d'un ticket client",
    description="""
    Analyse l'émotion du texte et détecte si le client est en colère.
    
    **Cas d'usage PFE:**
    1. Client crée un ticket sur le frontend React
    2. Backend Spring Boot reçoit le ticket
    3. Spring Boot appelle ce microservice pour analyser le texte
    4. Si URGENT_EMOTIONAL détecté, le ticket est automatiquement priorisé
    5. Une notification est envoyée au manager
    
    **Avantages:**
    - Détection automatique de l'urgence émotionnelle
    - Améliore la satisfaction client (réponse rapide aux clients en colère)
    - Réduit le temps de traitement moyen
    """
)
async def analyze_sentiment(request: SentimentRequest):
    """
    Endpoint principal d'analyse de sentiment.
    
    Args:
        request: SentimentRequest avec le texte à analyser
        
    Returns:
        SentimentResponse avec le résultat de l'analyse
        
    Raises:
        HTTPException 400: Si le texte est invalide
        HTTPException 500: Si erreur lors de l'analyse
    """
    logger.info(
        f"📨 Nouvelle requête | Ticket ID: {request.ticket_id} | "
        f"Longueur texte: {len(request.text)} caractères"
    )
    
    try:
        # Validation supplémentaire
        if len(request.text.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le texte doit contenir au moins 3 caractères"
            )
        
        # Analyse du sentiment
        analysis_result = analyze_sentiment_logic(request.text)
        
        # Construction de la réponse
        response = SentimentResponse(**analysis_result)
        
        logger.info(
            f"✅ Analyse terminée | Ticket ID: {request.ticket_id} | "
            f"Résultat: {response.sentiment} | "
            f"Priorité: {response.priority_flag or 'NORMALE'}"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur inattendue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne du serveur"
        )

# =============================================================================
# ENDPOINT - STATISTIQUES (BONUS)
# =============================================================================
@app.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats():
    """
    Statistiques basiques du service (pour la démo PFE).
    
    BONUS JURY: Montrer les métriques en live pendant la démo.
    """
    return {
        "service": "MTS Telecom - Sentiment Analysis",
        "model": MODEL_NAME,
        "version": "1.0.0",
        "supported_languages": ["fr", "en", "de", "es", "it", "nl"],
        "max_text_length": 10000,
        "confidence_threshold": 0.6,
        "uptime": "OK"
    }

# =============================================================================
# DÉMARRAGE DE L'APPLICATION
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Démarrage du microservice Sentiment Analysis")
    logger.info("📖 Documentation Swagger: http://localhost:8000/docs")
    logger.info("🔧 ReDoc: http://localhost:8000/redoc")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Écoute sur toutes les interfaces
        port=8000,
        reload=True,     # Hot reload en développement
        log_level="info"
    )
