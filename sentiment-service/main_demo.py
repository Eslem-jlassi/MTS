# =============================================================================
# MTS TELECOM - VERSION DEMO LEGERE (SANS BERT)
# =============================================================================
"""
Version simplifiée qui utilise des règles manuelles au lieu de BERT.
✓ Démarrage instantané (pas de téléchargement de modèle)
✓ Même API que la version complète
✓ Parfait pour la démo sans connexion internet

POUR VERSION COMPLETE AVEC BERT:
Utiliser main.py après installation de requirements.txt
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import logging
from typing import Optional
from datetime import datetime
import re

# =============================================================================
# LOGGING
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# APPLICATION FASTAPI
# =============================================================================
app = FastAPI(
    title="MTS Telecom - Sentiment Analysis DEMO",
    description="Version démo avec règles simples (sans BERT)",
    version="1.0.0-demo",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# MODÈLES PYDANTIC
# =============================================================================
class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    ticket_id: Optional[int] = None
    language: Optional[str] = "auto"
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Le texte ne peut pas être vide")
        return v.strip()

class SentimentResponse(BaseModel):
    sentiment: str
    score: float
    stars: int
    is_angry: bool
    priority_flag: Optional[str] = None
    confidence: float
    processed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# =============================================================================
# ANALYSE PAR RÈGLES (REMPLACE BERT)
# =============================================================================
def analyze_sentiment_rules(text: str) -> dict:
    """
    Analyse simplifiée par règles lexicales.
    
    MOTS-CLÉS:
    - Négatifs: inadmissible, horrible, nul, catastrophe, colère, etc.
    - Positifs: excellent, super, merci, parfait, satisfait, etc.
    - Intensificateurs: très, extrêmement, vraiment, trop
    """
    text_lower = text.lower()
    
    # DICTIONNAIRES
    negative_words = [
        'inadmissible', 'horrible', 'nul', 'catastrophe', 'colère', 'furieux',
        'mécontent', 'déçu', 'pire', 'mauvais', 'problème', 'panne', 'bug',
        'lent', 'cassé', 'ne marche pas', 'ne fonctionne pas', 'inacceptable',
        'scandaleux', 'honte', 'arnaque', 'résilier', 'annuler', 'remboursement'
    ]
    
    positive_words = [
        'excellent', 'super', 'merci', 'parfait', 'satisfait', 'content',
        'bravo', 'génial', 'top', 'rapide', 'efficace', 'professionnel',
        'formidable', 'magnifique', 'impeccable', 'recommande'
    ]
    
    intensifiers = ['très', 'extrêmement', 'vraiment', 'trop', 'complètement']
    
    exclamations = text.count('!') + text.count('!!!') * 2
    
    # COMPTAGE
    neg_count = sum(1 for word in negative_words if word in text_lower)
    pos_count = sum(1 for word in positive_words if word in text_lower)
    intensifier_count = sum(1 for word in intensifiers if word in text_lower)
    
    # CALCUL SCORE
    # Score de base
    if neg_count > pos_count:
        base_score = -1 * (neg_count - pos_count)
    elif pos_count > neg_count:
        base_score = 1 * (pos_count - neg_count)
    else:
        base_score = 0
    
    # Ajustement avec intensificateurs
    if intensifier_count > 0:
        base_score *= (1 + intensifier_count * 0.3)
    
    # Ajustement avec exclamations
    if exclamations > 2:
        if base_score < 0:
            base_score *= 1.5  # Plus de colère
        elif base_score > 0:
            base_score *= 1.3  # Plus d'enthousiasme
    
    # Caps lock (MAJUSCULES) = colère
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.3:  # > 30% en majuscules
        base_score -= 2
    
    # MAPPING VERS ÉTOILES
    if base_score <= -3:
        stars = 1
        sentiment = "TRÈS NÉGATIF"
        confidence = 0.85
    elif base_score <= -1:
        stars = 2
        sentiment = "NÉGATIF"
        confidence = 0.75
    elif base_score < 1:
        stars = 3
        sentiment = "NEUTRE"
        confidence = 0.65
    elif base_score < 3:
        stars = 4
        sentiment = "POSITIF"
        confidence = 0.75
    else:
        stars = 5
        sentiment = "TRÈS POSITIF"
        confidence = 0.85
    
    # DÉTECTION COLÈRE
    is_angry = (stars <= 2) and (confidence >= 0.6)
    priority_flag = "URGENT_EMOTIONAL" if is_angry else None
    
    logger.info(
        f"📊 [DEMO] Analyse: {sentiment} | Stars: {stars} | "
        f"Neg: {neg_count} | Pos: {pos_count} | Colère: {is_angry}"
    )
    
    return {
        "sentiment": sentiment,
        "score": confidence,
        "stars": stars,
        "is_angry": is_angry,
        "priority_flag": priority_flag,
        "confidence": round(confidence * 100, 2)
    }

# =============================================================================
# ENDPOINTS
# =============================================================================
@app.get("/health")
async def health_check():
    return {
        "status": "UP",
        "service": "sentiment-analysis-demo",
        "model": "rule-based (sans BERT)",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/analyze", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    logger.info(
        f"📨 Requête | Ticket: {request.ticket_id} | "
        f"Longueur: {len(request.text)} chars"
    )
    
    try:
        if len(request.text.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le texte doit contenir au moins 3 caractères"
            )
        
        result = analyze_sentiment_rules(request.text)
        response = SentimentResponse(**result)
        
        logger.info(
            f"✅ Analyse terminée | Ticket: {request.ticket_id} | "
            f"Résultat: {response.sentiment}"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/stats")
async def get_stats():
    return {
        "service": "MTS Telecom - Sentiment Analysis DEMO",
        "model": "Rule-based lexical analysis",
        "version": "1.0.0-demo",
        "note": "Version démo sans BERT. Pour production, utiliser main.py avec BERT.",
        "supported_languages": ["fr"],
        "max_text_length": 10000
    }

# =============================================================================
# DÉMARRAGE
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Démarrage DEMO Sentiment Analysis (sans BERT)")
    logger.info("📖 Swagger: http://localhost:8000/docs")
    
    uvicorn.run(
        "main_demo:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
