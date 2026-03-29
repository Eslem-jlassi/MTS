# =============================================================================
# MTS TELECOM — FONCTIONS UTILITAIRES
# =============================================================================
"""
Fonctions réutilisables utilisées par le moteur de règles et le classifieur.

PRINCIPE (JURY) :
  → Fonctions pures : même entrée → même sortie, pas d'effets de bord
  → Testables unitairement
  → Réutilisables dans d'autres modules
"""

import re
import unicodedata


def normalize_text(text: str) -> str:
    """
    Normalise un texte pour faciliter la recherche de mots-clés.

    Étapes :
      1. Conversion en minuscules
      2. Suppression des accents (é → e, à → a)
      3. Suppression de la ponctuation excessive
      4. Réduction des espaces multiples

    Pourquoi ? (JURY)
      → "Réseau" et "reseau" doivent matcher le même mot-clé
      → "PANNE!!!" et "panne" doivent être traités pareil
      → Robustesse face aux fautes de frappe courantes

    Exemple :
      >>> normalize_text("Réseau TRÈS lent!!!")
      "reseau tres lent"
    """
    # Minuscules
    text = text.lower()

    # Suppression des accents (NFD décompose, on retire les diacritiques)
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")

    # Remplacement de la ponctuation par des espaces
    text = re.sub(r"[^\w\s]", " ", text)

    # Réduction des espaces multiples
    text = re.sub(r"\s+", " ", text).strip()

    return text


def count_keyword_matches(text: str, keywords: list[str]) -> int:
    """
    Compte combien de mots-clés sont présents dans le texte.

    Le texte doit être déjà normalisé (voir normalize_text).

    Pourquoi compter plutôt que juste vérifier ? (JURY)
      → Plus il y a de mots-clés matchés, plus on est confiant
      → "réseau lent" → 2 matches pour LATENCE
      → "question" → 1 match pour DEMANDE_INFORMATION
      → Le nombre de matches influence le score de confiance

    Args:
        text: Texte normalisé à analyser
        keywords: Liste de mots-clés à chercher

    Returns:
        Nombre de mots-clés trouvés dans le texte
    """
    return sum(1 for kw in keywords if kw in text)


def combine_title_description(title: str, description: str | None) -> str:
    """
    Fusionne titre et description en un seul texte normalisé.

    Pourquoi fusionner ? (JURY)
      → Le titre contient souvent le sujet principal
      → La description contient les détails et le contexte émotionnel
      → Analyser les deux ensemble donne une vue complète

    Args:
        title: Titre du ticket
        description: Description optionnelle

    Returns:
        Texte combiné et normalisé
    """
    parts = [title]
    if description:
        parts.append(description)
    return normalize_text(" ".join(parts))


def calculate_text_intensity(text: str) -> float:
    """
    Calcule un score d'intensité émotionnelle du texte brut (avant normalisation).

    Indicateurs pris en compte :
      - Ratio de MAJUSCULES (crier en texte)
      - Nombre de points d'exclamation
      - Nombre de points d'interrogation répétés
      - Mots répétés (ex: "très très très lent")

    Pourquoi ? (JURY)
      → Un client qui écrit en majuscules est probablement plus frustré
      → "!!!" indique une urgence émotionnelle
      → Ce score module la priorité et l'urgence finales

    Returns:
        Score entre 0.0 (calme) et 1.0 (très intense)
    """
    score = 0.0

    # Ratio majuscules (> 30% du texte en caps = intensité)
    if len(text) > 5:
        caps_ratio = sum(1 for c in text if c.isupper()) / len(text)
        if caps_ratio > 0.30:
            score += 0.3

    # Exclamations
    excl_count = text.count("!")
    if excl_count >= 3:
        score += 0.3
    elif excl_count >= 1:
        score += 0.1

    # Interrogations multiples
    if text.count("?") >= 2:
        score += 0.1

    # Mots d'intensité dans le texte brut (avant normalisation)
    intensity_words = [
        "très", "trop", "extrêmement", "absolument", "vraiment", "complètement",
        "totalement", "carrément", "grave", "super", "hyper", "ultra",
        "encore", "toujours", "jamais", "rien", "plus rien",
    ]
    text_lower = text.lower()
    intensity_count = sum(1 for w in intensity_words if w in text_lower)
    score += min(intensity_count * 0.1, 0.3)

    # Répétitions de ponctuation ("!!!!" ou "????" ou "...")
    if re.search(r'[!]{2,}', text):
        score += 0.2
    if re.search(r'[?]{2,}', text):
        score += 0.1

    return min(score, 1.0)
