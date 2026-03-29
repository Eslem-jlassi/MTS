# =============================================================================
# MTS TELECOM — DÉTECTEUR DE DOUBLONS (Cœur IA du microservice)
# =============================================================================
"""
Ce fichier contient toute la logique IA et métier de détection de doublons.

ARCHITECTURE DU PIPELINE (JURY) :

  ┌─────────────────────┐
  │  Nouveau ticket      │
  │  + Tickets récents   │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  1. Préparer les    │  → Concaténer titre + description
  │     textes          │  → Normaliser (minuscules, accents...)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  2. Encoder avec    │  → Transformer chaque texte en vecteur (embedding)
  │     SentenceTransf. │  → 384 nombres par texte
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  3. Calculer la     │  → Similarité cosinus entre le nouveau et chaque
  │     similarité      │     ticket existant
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  4. Appliquer les   │  → Seuils : ≥0.85 = doublon, ≥0.70 = similaire
  │     règles métier   │  → 3+ similaires en 24h = incident de masse
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  5. Construire la   │  → is_duplicate, possible_mass_incident
  │     réponse         │  → matched_tickets, reasoning, recommendation
  └─────────────────────┘

C'EST QUOI UN EMBEDDING ? (JURY)
  Un embedding transforme un texte en une liste de nombres (un vecteur).
  C'est comme une "empreinte numérique" du sens du texte.

  Texte : "Réseau très lent" → Vecteur : [0.12, -0.45, 0.78, ..., 0.33]  (384 nombres)

  Deux textes qui parlent du même sujet auront des vecteurs proches.
  Deux textes sur des sujets différents auront des vecteurs éloignés.

C'EST QUOI LA SIMILARITÉ COSINUS ? (JURY)
  La similarité cosinus mesure l'angle entre deux vecteurs.
  → cos(0°) = 1.0 → vecteurs parallèles → textes identiques
  → cos(90°) = 0.0 → vecteurs perpendiculaires → textes sans rapport

  C'est plus fiable que la distance euclidienne car elle ne dépend pas
  de la longueur des vecteurs (un texte court peut être aussi pertinent
  qu'un texte long).

POURQUOI SENTENCETRANSFORMERS ? (JURY)
  → Spécialisé pour comparer des phrases (pas juste des mots)
  → "Réseau lent" et "Internet lent" → haute similarité (même sens)
  → Un simple TF-IDF ne capterait pas cette nuance
  → Pré-entraîné sur des millions de paires de phrases
  → Pas besoin de notre propre dataset d'entraînement
"""

import logging
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

from .config import (
    MODEL_NAME,
    DUPLICATE_THRESHOLD,
    SIMILAR_THRESHOLD,
    MASS_INCIDENT_MIN_TICKETS,
    MASS_INCIDENT_TIME_WINDOW_HOURS,
    MAX_RESULTS,
)
from .schemas import (
    DuplicateRequest,
    DuplicateResponse,
    MatchedTicket,
)
from .utils import combine_ticket_text, get_duplicate_level, is_within_time_window

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# CHARGEMENT DU MODÈLE (SentenceTransformers ou fallback TF-IDF)
# ─────────────────────────────────────────────────────────────────────────────

_model = None
_mode = "none"  # "sentence-transformers" ou "tfidf"


def load_model() -> bool:
    """
    Charge le modèle d'embeddings au démarrage du service.

    Stratégie :
      1. Essaie SentenceTransformers (meilleure qualité sémantique)
      2. Si indisponible → fallback TF-IDF (scikit-learn, toujours dispo)

    Le mode TF-IDF est moins précis (comparaison de mots, pas de sens)
    mais fonctionne sans torch ni SentenceTransformers.

    Returns:
        True si un modèle (ST ou TF-IDF) est chargé
    """
    global _model, _mode

    # Tentative 1 : SentenceTransformers
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Chargement du modèle SentenceTransformers '{MODEL_NAME}' (mode offline-first)...")
        _model = SentenceTransformer(MODEL_NAME, local_files_only=True)
        _mode = "sentence-transformers"
        logger.info(f"Modèle ST chargé depuis le cache local ! Dimension : {_model.get_sentence_embedding_dimension()}")
        return True
    except Exception as e:
        logger.warning(
            f"SentenceTransformers indisponible localement : {e}. "
            "Fallback TF-IDF activé."
        )

    # Tentative 2 : Fallback TF-IDF
    try:
        from sklearn.pipeline import make_union
        logger.info("Fallback → TF-IDF (scikit-learn)...")
        # Combinaison word + char n-grams pour de meilleurs scores
        word_tfidf = TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True,
        )
        char_tfidf = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 5),
            max_features=10000,
            sublinear_tf=True,
        )
        _model = make_union(word_tfidf, char_tfidf)
        _mode = "tfidf"
        logger.info("Mode TF-IDF activé (word + char n-grams)")
        return True
    except Exception as e:
        logger.error(f"Impossible de charger TF-IDF : {e}")
        _model = None
        _mode = "none"
        return False


def is_model_loaded() -> bool:
    """Vérifie si un modèle (ST ou TF-IDF) est disponible."""
    return _model is not None and _mode != "none"


def get_mode() -> str:
    """Retourne le mode actif : 'sentence-transformers', 'tfidf', ou 'none'."""
    return _mode


# ─────────────────────────────────────────────────────────────────────────────
# ENCODAGE DES TEXTES
# ─────────────────────────────────────────────────────────────────────────────

def encode_texts(texts: list[str]) -> np.ndarray:
    """
    Transforme une liste de textes en vecteurs.

    Selon le mode :
      - sentence-transformers : embeddings sémantiques (384 dims)
      - tfidf : vecteurs TF-IDF (n-grams de caractères)

    Args:
        texts: Liste de textes à encoder

    Returns:
        Matrice numpy de shape (n_texts, dim)

    Raises:
        RuntimeError: Si aucun modèle n'est chargé
    """
    if _model is None:
        raise RuntimeError("Aucun modèle n'est chargé")

    if _mode == "sentence-transformers":
        embeddings = _model.encode(
            texts,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return np.array(embeddings)
    else:
        # TF-IDF : fit_transform sur tous les textes à chaque requête
        tfidf_matrix = _model.fit_transform(texts)
        return tfidf_matrix.toarray()


# ─────────────────────────────────────────────────────────────────────────────
# CALCUL DE SIMILARITÉ
# ─────────────────────────────────────────────────────────────────────────────

def compute_similarities(new_embedding: np.ndarray, recent_embeddings: np.ndarray) -> np.ndarray:
    """
    Calcule la similarité cosinus entre le nouveau ticket et chaque ticket récent.

    Mathématiquement :
      sim(A, B) = (A · B) / (||A|| × ||B||)

    Comme les embeddings sont déjà normalisés (normalize_embeddings=True),
    c'est simplement le produit scalaire.

    Args:
        new_embedding: Vecteur du nouveau ticket, shape (1, 384)
        recent_embeddings: Matrice des tickets récents, shape (n, 384)

    Returns:
        Array de scores de similarité, shape (n,)
        Chaque valeur est entre 0.0 et 1.0
    """
    similarities = cosine_similarity(new_embedding, recent_embeddings)
    return similarities[0]  # Passer de shape (1, n) à (n,)


# ─────────────────────────────────────────────────────────────────────────────
# CONSTRUCTION DU RAISONNEMENT
# ─────────────────────────────────────────────────────────────────────────────

def build_reasoning(
    is_duplicate: bool,
    possible_mass_incident: bool,
    best_score: float,
    high_count: int,
    medium_count: int,
    same_service: bool,
) -> str:
    """
    Génère une explication lisible de la décision.

    Pourquoi c'est important ? (JURY)
      → IA explicable : l'agent doit comprendre POURQUOI le système alerte
      → Pas de "boîte noire" : chaque décision est justifiée
      → Confiance : l'utilisateur peut vérifier si l'IA a raison

    Returns:
        Explication en français
    """
    parts = []

    if is_duplicate:
        parts.append(f"Doublon probable détecté (similarité max : {best_score:.0%}).")
    elif high_count > 0:
        parts.append(f"{high_count} ticket(s) très similaire(s) trouvé(s).")
    elif medium_count > 0:
        parts.append(f"{medium_count} ticket(s) moyennement similaire(s) trouvé(s).")
    else:
        parts.append("Aucun ticket particulièrement similaire trouvé.")

    if possible_mass_incident:
        parts.append("Plusieurs tickets récents signalent un problème similaire — risque d'incident de masse.")

    if same_service:
        parts.append("Les tickets similaires concernent le même service.")

    return " ".join(parts)


def build_recommendation(
    is_duplicate: bool,
    possible_mass_incident: bool,
    best_score: float,
    sim_threshold: float = SIMILAR_THRESHOLD,
) -> str:
    """
    Génère une recommandation d'action pour l'agent de support.

    Returns:
        Action recommandée en français
    """
    if possible_mass_incident and is_duplicate:
        return (
            "ALERTE : Incident de masse probable. "
            "Vérifier immédiatement avec l'équipe technique et notifier le manager. "
            "Ce ticket est probablement lié à un problème global."
        )
    elif possible_mass_incident:
        return (
            "ATTENTION : Plusieurs tickets similaires détectés récemment. "
            "Vérifier s'il s'agit d'un incident global affectant plusieurs clients."
        )
    elif is_duplicate:
        return (
            "Ce ticket est probablement un doublon. "
            "Vérifier le(s) ticket(s) similaire(s) et envisager de fusionner ou lier."
        )
    elif best_score >= sim_threshold:
        return (
            "Des tickets similaires existent. "
            "Consulter les tickets liés avant de traiter pour éviter les doublons."
        )
    else:
        return "Aucun doublon détecté. Traiter le ticket normalement."


# ─────────────────────────────────────────────────────────────────────────────
# DÉTECTION COMPLÈTE (FONCTION PRINCIPALE)
# ─────────────────────────────────────────────────────────────────────────────

def detect_duplicates(request: DuplicateRequest) -> DuplicateResponse:
    """
    Pipeline complet de détection de doublons.

    Étapes détaillées :
      1. Préparer les textes (concat titre + description, normaliser)
      2. Encoder tous les textes en embeddings
      3. Calculer la similarité cosinus
      4. Filtrer les tickets au-dessus du seuil SIMILAR_THRESHOLD
      5. Vérifier si c'est un doublon (score ≥ DUPLICATE_THRESHOLD)
      6. Vérifier si c'est un incident de masse
      7. Construire la réponse avec explication

    Args:
        request: DuplicateRequest contenant new_ticket + recent_tickets

    Returns:
        DuplicateResponse avec tous les résultats
    """
    new_ticket = request.new_ticket
    recent_tickets = request.recent_tickets

    logger.info(
        f"Analyse de doublon : '{new_ticket.title[:50]}' "
        f"vs {len(recent_tickets)} ticket(s) récent(s)"
    )

    # ── ÉTAPE 1 : Préparer les textes ──
    new_text = combine_ticket_text(new_ticket.title, new_ticket.description)
    recent_texts = [
        combine_ticket_text(t.title, t.description)
        for t in recent_tickets
    ]

    # Seuils adaptés au mode (TF-IDF donne des scores plus bas que ST)
    if _mode == "tfidf":
        dup_threshold = DUPLICATE_THRESHOLD * 0.50   # 0.85 → ~0.42
        sim_threshold = SIMILAR_THRESHOLD * 0.35     # 0.70 → ~0.245
    else:
        dup_threshold = DUPLICATE_THRESHOLD
        sim_threshold = SIMILAR_THRESHOLD

    logger.debug(f"Texte nouveau ticket : '{new_text[:80]}...'")
    logger.debug(f"Seuils ({_mode}) : duplicate={dup_threshold:.2f}, similar={sim_threshold:.2f}")

    # ── ÉTAPE 2 : Encoder en embeddings ──
    all_texts = [new_text] + recent_texts
    all_embeddings = encode_texts(all_texts)

    new_embedding = all_embeddings[0:1]      # Shape (1, 384)
    recent_embeddings = all_embeddings[1:]    # Shape (n, 384)

    # ── ÉTAPE 3 : Calculer la similarité ──
    scores = compute_similarities(new_embedding, recent_embeddings)

    logger.debug(f"Scores de similarité : {[f'{s:.2f}' for s in scores]}")

    # ── ÉTAPE 4 : Filtrer et trier les résultats ──
    matched_tickets: list[MatchedTicket] = []
    high_count = 0
    medium_count = 0
    similar_in_window = 0  # Pour la détection d'incident de masse

    for i, score in enumerate(scores):
        score_float = float(score)
        ticket = recent_tickets[i]

        # Ne garder que les tickets au-dessus du seuil similaire
        if score_float < sim_threshold:
            continue

        level = get_duplicate_level(score_float, dup_threshold, sim_threshold)

        if level == "HIGH":
            high_count += 1
        elif level == "MEDIUM":
            medium_count += 1

        # Vérifier la fenêtre temporelle pour l'incident de masse
        if is_within_time_window(
            ticket.created_at,
            new_ticket.created_at,
            MASS_INCIDENT_TIME_WINDOW_HOURS,
        ):
            similar_in_window += 1

        matched_tickets.append(MatchedTicket(
            ticket_id=ticket.id,
            title=ticket.title,
            similarity_score=round(score_float, 4),
            duplicate_level=level,
        ))

    # Trier par score décroissant
    matched_tickets.sort(key=lambda t: t.similarity_score, reverse=True)

    # Limiter le nombre de résultats
    matched_tickets = matched_tickets[:MAX_RESULTS]

    # ── ÉTAPE 5 : Décisions métier ──
    best_score = matched_tickets[0].similarity_score if matched_tickets else 0.0
    is_duplicate = best_score >= dup_threshold
    possible_mass_incident = similar_in_window >= MASS_INCIDENT_MIN_TICKETS

    # Vérifier si les tickets similaires concernent le même service
    same_service = False
    if new_ticket.service and matched_tickets:
        similar_service_ids = [
            recent_tickets[i].id for i, s in enumerate(scores)
            if float(s) >= sim_threshold
        ]
        same_service_tickets = [
            t for t in recent_tickets
            if t.id in similar_service_ids and t.service == new_ticket.service
        ]
        same_service = len(same_service_tickets) > 0

    # ── ÉTAPE 6 : Construire la réponse ──
    reasoning = build_reasoning(
        is_duplicate, possible_mass_incident,
        best_score, high_count, medium_count, same_service,
    )
    recommendation = build_recommendation(
        is_duplicate, possible_mass_incident, best_score, sim_threshold,
    )

    logger.info(
        f"Résultat : duplicate={is_duplicate}, mass_incident={possible_mass_incident}, "
        f"best_score={best_score:.2f}, matches={len(matched_tickets)}"
    )

    return DuplicateResponse(
        is_duplicate=is_duplicate,
        possible_mass_incident=possible_mass_incident,
        duplicate_confidence=round(best_score, 4),
        matched_tickets=matched_tickets,
        reasoning=reasoning,
        recommendation=recommendation,
    )
