# =============================================================================
# MTS TELECOM — CLASSIFICATEUR HYBRIDE (BERT + RÈGLES)
# =============================================================================
"""
Ce fichier orchestre la classification complète d'un ticket.

ARCHITECTURE HYBRIDE (JURY) :
  ┌─────────────┐     ┌──────────────┐
  │  Texte du   │────▶│  BERT NLP    │──▶ Sentiment (POSITIVE/NEGATIVE/NEUTRAL)
  │  ticket     │     │  (pipeline)  │    + score (-1.0 à +1.0)
  │             │     └──────────────┘
  │             │
  │             │     ┌──────────────┐
  │             │────▶│  Moteur de   │──▶ Catégorie, Service, Urgence
  │             │     │  règles      │    (mots-clés + heuristiques)
  └─────────────┘     └──────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Combinaison     │──▶ Priorité, Criticité,
                    │  des signaux     │    Confiance, Raisonnement
                    └──────────────────┘
                             │
                             ▼
                    ClassificationResponse

  POURQUOI HYBRIDE ?
    → BERT est bon pour capter l'émotion/contexte (sémantique profonde)
    → Les règles sont bonnes pour la classification métier (domaine télécom)
    → Ensemble = meilleur des deux mondes
    → Fallback : si BERT échoue, les règles fonctionnent seules
"""

import logging
from typing import Optional
from .config import Sentiment, ANGER_KEYWORDS, NEGATIVE_PATTERNS
from .schemas import ClassificationRequest, ClassificationResponse
from .utils import combine_title_description, calculate_text_intensity, count_keyword_matches
from .rules import (
    classify_category,
    classify_service,
    detect_urgency_level,
    calculate_priority,
    calculate_criticality,
    calculate_confidence,
    build_reasoning,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE BERT (chargé au démarrage de l'application)
# ─────────────────────────────────────────────────────────────────────────────

_sentiment_pipeline = None


def load_model() -> bool:
    """
    Charge le modèle BERT pour l'analyse de sentiment.

    Modèle utilisé : nlptown/bert-base-multilingual-uncased-sentiment
      → Supporte le français
      → Classifie en 1-5 étoiles (qu'on convertit en POSITIVE/NEGATIVE/NEUTRAL)
      → ~500MB de mémoire

    Appelé au démarrage (startup event dans main.py).
    Si le chargement échoue (pas de dépendances torch, réseau...), le système
    fonctionne en mode dégradé avec les règles seules.

    Returns:
        True si le modèle est chargé, False sinon
    """
    global _sentiment_pipeline
    try:
        from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
        logger.info("Chargement du modèle BERT sentiment (mode offline-first)...")
        model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
        tokenizer = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
        model = AutoModelForSequenceClassification.from_pretrained(model_name, local_files_only=True)
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=model,
            tokenizer=tokenizer,
            truncation=True,
            max_length=512,
        )
        logger.info("Modèle BERT chargé avec succès (cache local) !")
        return True
    except Exception as e:
        logger.warning(
            f"BERT indisponible localement : {e}. "
            "Mode dégradé activé (règles seules). "
            "Pré-téléchargez le modèle pour activer le mode hybride."
        )
        _sentiment_pipeline = None
        return False


def is_model_loaded() -> bool:
    """Vérifie si le modèle BERT est disponible."""
    return _sentiment_pipeline is not None


# ─────────────────────────────────────────────────────────────────────────────
# ANALYSE DE SENTIMENT (BERT)
# ─────────────────────────────────────────────────────────────────────────────

def analyze_sentiment_bert(text: str) -> tuple[Sentiment, float]:
    """
    Analyse le sentiment avec BERT si disponible.

    Conversion étoiles → sentiment :
      1-2 étoiles → NEGATIVE (score = -0.8 à -0.5)
      3 étoiles   → NEUTRAL  (score = 0.0)
      4-5 étoiles → POSITIVE (score = +0.5 à +0.8)

    Args:
        text: Texte à analyser (max 512 tokens)

    Returns:
        Tuple (sentiment_enum, score_numérique)
    """
    if _sentiment_pipeline is None:
        return Sentiment.NEUTRAL, 0.0

    try:
        # Limiter la longueur pour éviter les erreurs
        text_truncated = text[:1000]
        result = _sentiment_pipeline(text_truncated)[0]

        label = result["label"]  # Ex: "1 star", "5 stars"
        confidence = result["score"]

        # Extraire le nombre d'étoiles
        stars = int(label.split()[0])

        # Convertir en sentiment + score
        if stars <= 2:
            return Sentiment.NEGATIVE, round(-0.5 - (confidence * 0.3), 2)
        elif stars >= 4:
            return Sentiment.POSITIVE, round(0.5 + (confidence * 0.3), 2)
        else:
            return Sentiment.NEUTRAL, 0.0

    except Exception as e:
        logger.error(f"Erreur BERT : {e}")
        return Sentiment.NEUTRAL, 0.0


# ─────────────────────────────────────────────────────────────────────────────
# ANALYSE DE SENTIMENT PAR RÈGLES (FALLBACK)
# ─────────────────────────────────────────────────────────────────────────────

def analyze_sentiment_rules(normalized_text: str, intensity: float) -> tuple[Sentiment, float]:
    """
    Analyse de sentiment basée sur les règles (quand BERT n'est pas dispo).

    Logique simple mais efficace :
      1. Compter les mots de colère/frustration (ANGER_KEYWORDS)
      2. Combiner avec l'intensité émotionnelle
      3. Déterminer le sentiment global

    Pourquoi garder un fallback ? (JURY)
      → En production, BERT peut planter (mémoire, GPU...)
      → Le système doit TOUJOURS répondre
      → Mieux vaut une réponse approximative que pas de réponse

    Args:
        normalized_text: Texte normalisé
        intensity: Score d'intensité émotionnelle (0.0 à 1.0)

    Returns:
        Tuple (sentiment, score)
    """
    anger_count = count_keyword_matches(normalized_text, ANGER_KEYWORDS)
    negative_count = count_keyword_matches(normalized_text, NEGATIVE_PATTERNS)

    # Score combiné : mots de colère (fort), négations (moyen), intensité (modulateur)
    negative_score = (anger_count * 0.25) + (negative_count * 0.15) + (intensity * 0.4)

    if negative_score >= 0.5:
        return Sentiment.NEGATIVE, round(-0.7, 2)
    elif negative_score >= 0.2:
        return Sentiment.NEGATIVE, round(-0.4, 2)
    elif negative_score >= 0.1:
        return Sentiment.NEGATIVE, round(-0.2, 2)
    elif intensity < 0.1 and anger_count == 0 and negative_count == 0:
        return Sentiment.NEUTRAL, 0.0
    else:
        return Sentiment.NEUTRAL, round(-0.1, 2)


# ─────────────────────────────────────────────────────────────────────────────
# CLASSIFICATION COMPLÈTE (FONCTION PRINCIPALE)
# ─────────────────────────────────────────────────────────────────────────────

def classify_ticket(request: ClassificationRequest) -> ClassificationResponse:
    """
    Pipeline complet de classification d'un ticket.

    Étapes :
      1. Normaliser le texte (utils.py)
      2. Calculer l'intensité émotionnelle (utils.py)
      3. Analyser le sentiment (BERT ou règles)
      4. Classifier la catégorie (rules.py)
      5. Classifier le service (rules.py)
      6. Déterminer l'urgence (rules.py)
      7. Calculer la priorité (rules.py)
      8. Calculer la criticité (rules.py)
      9. Calculer la confiance (rules.py)
      10. Générer le raisonnement (rules.py)

    Args:
        request: ClassificationRequest contenant title et description

    Returns:
        ClassificationResponse avec tous les champs remplis
    """
    logger.info(f"Classification du ticket : '{request.title[:50]}...'")

    # ── ÉTAPE 1 : Préparer le texte ──
    normalized = combine_title_description(request.title, request.description)

    # ── ÉTAPE 2 : Intensité émotionnelle ──
    raw_text = f"{request.title} {request.description or ''}"
    intensity = calculate_text_intensity(raw_text)
    logger.debug(f"Intensité émotionnelle : {intensity}")

    # ── ÉTAPE 3 : Sentiment (BERT ou fallback) ──
    if is_model_loaded():
        sentiment, sentiment_score = analyze_sentiment_bert(raw_text)
        has_sentiment = True
        logger.debug(f"Sentiment BERT : {sentiment.value} ({sentiment_score})")
    else:
        sentiment, sentiment_score = analyze_sentiment_rules(normalized, intensity)
        has_sentiment = False
        logger.debug(f"Sentiment règles (fallback) : {sentiment.value} ({sentiment_score})")

    # ── ÉTAPE 4 : Catégorie ──
    category, cat_matches = classify_category(normalized)
    logger.debug(f"Catégorie : {category.value} ({cat_matches} matches)")

    # ── ÉTAPE 5 : Service ──
    service, svc_matches = classify_service(normalized, category)
    logger.debug(f"Service : {service.value} ({svc_matches} matches)")

    # ── ÉTAPE 6 : Urgence ──
    urgency = detect_urgency_level(normalized, intensity)

    # ── ÉTAPE 7 : Priorité ──
    priority = calculate_priority(category, urgency, sentiment_score, intensity)

    # ── ÉTAPE 8 : Criticité ──
    criticality = calculate_criticality(priority, urgency)

    # ── ÉTAPE 9 : Confiance ──
    confidence = calculate_confidence(cat_matches, svc_matches, has_sentiment)

    # ── ÉTAPE 10 : Raisonnement ──
    reasoning = build_reasoning(
        normalized, category, service, priority,
        sentiment.value, cat_matches, svc_matches,
    )

    logger.info(
        f"Résultat : {category.value}/{priority.value}/{service.value} "
        f"(confiance: {confidence})"
    )

    return ClassificationResponse(
        category=category.value,
        priority=priority.value,
        service=service.value,
        urgency=urgency.value,
        sentiment=sentiment.value,
        criticality=criticality.value,
        confidence=confidence,
        reasoning=reasoning,
    )
