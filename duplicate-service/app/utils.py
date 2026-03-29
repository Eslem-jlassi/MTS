# =============================================================================
# MTS TELECOM — FONCTIONS UTILITAIRES
# =============================================================================
"""
Fonctions pures et réutilisables pour le traitement de texte.

PRINCIPE (JURY) :
  → Fonctions pures : même entrée → même sortie, pas d'effet de bord
  → Testables unitairement (on peut tester chaque fonction seule)
  → Réutilisables par d'autres modules
  → Séparées de la logique métier (SRP)
"""

import re
import unicodedata
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """
    Normalise un texte pour améliorer la qualité des embeddings.

    Étapes :
      1. Conversion en minuscules
      2. Suppression des accents (é → e, à → a)
      3. Nettoyage de la ponctuation excessive
      4. Réduction des espaces multiples

    Pourquoi normaliser AVANT l'embedding ? (JURY)
      → Le modèle SentenceTransformers gère déjà bien les accents
      → MAIS la normalisation aide pour les cas extrêmes :
        "RÉSEAU TRÈS LENT!!!" vs "reseau tres lent" → plus cohérent
      → Rend les comparaisons plus fiables

    Args:
        text: Texte brut à normaliser

    Returns:
        Texte normalisé

    Exemple :
        >>> normalize_text("RÉSEAU très LENT!!!")
        "reseau tres lent"
    """
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def combine_ticket_text(title: str, description: str | None) -> str:
    """
    Fusionne le titre et la description d'un ticket en un seul texte.

    Stratégie :
      → Le titre est toujours présent et contient l'essentiel
      → La description ajoute du contexte (peut être vide)
      → On les concatène avec un séparateur
      → On normalise le résultat

    Pourquoi concaténer ? (JURY)
      → Un embedding unique par ticket = une seule comparaison
      → Le titre donne le sujet, la description donne les détails
      → Ensemble, ils donnent une représentation complète du ticket

    Args:
        title: Titre du ticket (obligatoire)
        description: Description du ticket (optionnelle)

    Returns:
        Texte combiné et normalisé
    """
    parts = [title]
    if description and description.strip():
        parts.append(description.strip())
    combined = " . ".join(parts)
    return normalize_text(combined)


def get_duplicate_level(score: float, duplicate_threshold: float, similar_threshold: float) -> str:
    """
    Convertit un score de similarité en niveau lisible.

    Mapping :
      score ≥ duplicate_threshold (0.85) → "HIGH"   (doublon très probable)
      score ≥ similar_threshold (0.70)   → "MEDIUM" (ticket similaire)
      sinon                              → "LOW"    (possiblement lié)

    Pourquoi des niveaux textuels ? (JURY)
      → Un agent de support ne manipule pas des nombres flottants
      → "HIGH" est immédiatement actionnable
      → Le score précis est quand même fourni pour les curieux

    Args:
        score: Score de similarité cosinus (0.0 à 1.0)
        duplicate_threshold: Seuil pour "doublon"
        similar_threshold: Seuil pour "similaire"

    Returns:
        "HIGH", "MEDIUM" ou "LOW"
    """
    if score >= duplicate_threshold:
        return "HIGH"
    elif score >= similar_threshold:
        return "MEDIUM"
    else:
        return "LOW"


def is_within_time_window(
    ticket_time: datetime | None,
    reference_time: datetime | None,
    window_hours: int,
) -> bool:
    """
    Vérifie si un ticket a été créé dans la fenêtre temporelle.

    Utilisé pour la détection d'incident de masse :
      → Si 3+ tickets similaires sont créés en 24h → incident probable

    Gère les cas où les dates sont absentes (retourne True par défaut
    pour ne pas exclure un ticket potentiellement pertinent).

    Args:
        ticket_time: Date de création du ticket existant
        reference_time: Date du nouveau ticket (point de référence)
        window_hours: Taille de la fenêtre en heures

    Returns:
        True si le ticket est dans la fenêtre (ou si les dates manquent)
    """
    if ticket_time is None or reference_time is None:
        return True  # En cas de doute, on inclut le ticket

    # Rendre les deux datetimes "aware" ou "naive" pour comparaison
    if ticket_time.tzinfo is None:
        ticket_time = ticket_time.replace(tzinfo=timezone.utc)
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)

    diff_hours = abs((reference_time - ticket_time).total_seconds()) / 3600
    return diff_hours <= window_hours
