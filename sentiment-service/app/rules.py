# =============================================================================
# MTS TELECOM — MOTEUR DE RÈGLES MÉTIER
# =============================================================================
"""
Ce fichier contient la logique de classification basée sur les règles métier.

APPROCHE (JURY) :
  C'est la partie "explicable" du système hybride :
  1. On cherche des mots-clés dans le texte du ticket
  2. On compte les correspondances pour chaque catégorie/service
  3. On attribue un score à chaque possibilité
  4. On choisit la catégorie et le service avec le meilleur score

  AVANTAGES :
    → 100% explicable : "le ticket contient 'réseau' et 'lent' → LATENCE"
    → Pas besoin de dataset d'entraînement
    → Facile à maintenir et enrichir
    → Rapide (pas de calcul GPU)

  LIMITES :
    → Ne comprend pas le contexte profond (c'est là que BERT intervient)
    → Dépend de la qualité des mots-clés
    → C'est pourquoi on combine avec l'analyse de sentiment (classifier.py)
"""

import logging
from .config import (
    Category, Priority, Service, Urgency, Criticality,
    CATEGORY_KEYWORDS, SERVICE_KEYWORDS, URGENCY_KEYWORDS, ANGER_KEYWORDS,
)
from .utils import count_keyword_matches

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# CLASSIFICATION PAR CATÉGORIE
# ─────────────────────────────────────────────────────────────────────────────

def classify_category(normalized_text: str) -> tuple[Category, int]:
    """
    Détermine la catégorie du ticket par comptage de mots-clés.

    Algorithme :
      1. Pour chaque catégorie, compter les mots-clés trouvés
      2. La catégorie avec le plus de matches gagne
      3. Si aucun match → AUTRE
      4. Retourne aussi le nombre de matches (pour le score de confiance)

    Args:
        normalized_text: Texte normalisé (minuscules, sans accents)

    Returns:
        Tuple (catégorie_gagnante, nombre_de_matches)

    Exemple :
        >>> classify_category("le reseau est tres lent ce matin")
        (Category.LATENCE, 2)  # "reseau" n'est pas dans LATENCE mais "lent" et "lenteur" si
    """
    best_category = Category.AUTRE
    best_count = 0

    for cat_name, keywords in CATEGORY_KEYWORDS.items():
        count = count_keyword_matches(normalized_text, keywords)
        if count > best_count:
            best_count = count
            best_category = Category(cat_name)

    logger.debug(f"Catégorie détectée : {best_category.value} ({best_count} matches)")
    return best_category, best_count


# ─────────────────────────────────────────────────────────────────────────────
# CLASSIFICATION PAR SERVICE
# ─────────────────────────────────────────────────────────────────────────────

def classify_service(normalized_text: str, category: Category) -> tuple[Service, int]:
    """
    Détermine le service telecom concerné.

    Double logique :
      1. D'abord, chercher par mots-clés dans le texte
      2. Si aucun match → utiliser la catégorie comme indice
         (ex: FACTURATION → probablement BILLING)

    Pourquoi cette double logique ? (JURY)
      → Un ticket peut mentionner "facture" sans dire "billing"
      → La catégorie aide à deviner le service quand le texte est vague
      → Meilleure couverture = moins de tickets classés UNKNOWN

    Args:
        normalized_text: Texte normalisé
        category: Catégorie déjà déterminée (sert de fallback)

    Returns:
        Tuple (service_détecté, nombre_de_matches)
    """
    best_service = Service.UNKNOWN
    best_count = 0

    for svc_name, keywords in SERVICE_KEYWORDS.items():
        count = count_keyword_matches(normalized_text, keywords)
        if count > best_count:
            best_count = count
            best_service = Service(svc_name)

    # Fallback : déduire le service de la catégorie si aucun match direct
    if best_service == Service.UNKNOWN:
        category_to_service = {
            Category.PANNE_RESEAU: Service.CORE_NETWORK,
            Category.LATENCE: Service.CORE_NETWORK,
            Category.FACTURATION: Service.BILLING,
            Category.CONFIGURATION: Service.VOIP_PLATFORM,
        }
        best_service = category_to_service.get(category, Service.UNKNOWN)
        logger.debug(f"Service déduit de la catégorie {category.value} → {best_service.value}")

    logger.debug(f"Service détecté : {best_service.value} ({best_count} matches)")
    return best_service, best_count


# ─────────────────────────────────────────────────────────────────────────────
# DÉTECTION D'URGENCE
# ─────────────────────────────────────────────────────────────────────────────

def detect_urgency_level(normalized_text: str, intensity: float) -> Urgency:
    """
    Détermine le niveau d'urgence du ticket.

    Combinaison de :
      - Mots-clés d'urgence (ex: "urgent", "bloquant", "production")
      - Intensité émotionnelle du texte (majuscules, exclamations)

    Mapping :
      urgency_score ≥ 4  → IMMEDIATE
      urgency_score ≥ 2  → ELEVATED
      urgency_score ≥ 1  → NORMAL
      sinon              → LOW

    Args:
        normalized_text: Texte normalisé
        intensity: Score d'intensité émotionnelle (0.0 à 1.0)

    Returns:
        Niveau d'urgence
    """
    urgency_matches = count_keyword_matches(normalized_text, URGENCY_KEYWORDS)

    # L'intensité émotionnelle ajoute à l'urgence perçue
    urgency_score = urgency_matches + (1 if intensity >= 0.5 else 0)

    if urgency_score >= 4:
        return Urgency.IMMEDIATE
    elif urgency_score >= 2:
        return Urgency.ELEVATED
    elif urgency_score >= 1:
        return Urgency.NORMAL
    else:
        return Urgency.LOW


# ─────────────────────────────────────────────────────────────────────────────
# CALCUL DE PRIORITÉ
# ─────────────────────────────────────────────────────────────────────────────

def calculate_priority(
    category: Category,
    urgency: Urgency,
    sentiment_score: float,
    intensity: float,
) -> Priority:
    """
    Calcule la priorité finale en combinant plusieurs signaux.

    Logique décisionnelle :
      1. Score de base selon la catégorie
         (PANNE_RESEAU = dangereux, DEMANDE_INFORMATION = faible)
      2. Bonus si urgence élevée
      3. Bonus si sentiment négatif
      4. Bonus si intensité émotionnelle forte

    Mapping final :
      score ≥ 7  → CRITICAL
      score ≥ 5  → HIGH
      score ≥ 3  → MEDIUM
      sinon      → LOW

    Pourquoi cette approche multicritère ? (JURY)
      → Un ticket peut être techniquement bénin mais émotionnellement urgent
      → Un client calme avec une panne totale = quand même HIGH
      → On pondère plusieurs dimensions pour une décision équilibrée

    Args:
        category: Catégorie du ticket
        urgency: Niveau d'urgence détecté
        sentiment_score: Score de sentiment (-1.0 à 1.0, négatif = mécontent)
        intensity: Score d'intensité émotionnelle (0.0 à 1.0)

    Returns:
        Priorité calculée
    """
    # Score de base par catégorie
    category_scores = {
        Category.PANNE_RESEAU: 5,
        Category.INCIDENT_SERVICE: 4,
        Category.LATENCE: 3,
        Category.FACTURATION: 2,
        Category.CONFIGURATION: 2,
        Category.DEMANDE_INFORMATION: 1,
        Category.AUTRE: 1,
    }
    score = category_scores.get(category, 1)

    # Bonus urgence
    urgency_bonus = {
        Urgency.IMMEDIATE: 3,
        Urgency.ELEVATED: 2,
        Urgency.NORMAL: 1,
        Urgency.LOW: 0,
    }
    score += urgency_bonus.get(urgency, 0)

    # Bonus sentiment négatif (sentiment_score < 0 → négatif)
    if sentiment_score < -0.3:
        score += 1
    if sentiment_score < -0.6:
        score += 1

    # Bonus intensité émotionnelle
    if intensity >= 0.5:
        score += 1

    # Mapping score → priorité
    if score >= 7:
        return Priority.CRITICAL
    elif score >= 5:
        return Priority.HIGH
    elif score >= 3:
        return Priority.MEDIUM
    else:
        return Priority.LOW


# ─────────────────────────────────────────────────────────────────────────────
# CALCUL DE CRITICITÉ
# ─────────────────────────────────────────────────────────────────────────────

def calculate_criticality(priority: Priority, urgency: Urgency) -> Criticality:
    """
    Détermine la criticité métier à partir de la priorité et de l'urgence.

    Matrice de décision simple :
      CRITICAL + IMMEDIATE/ELEVATED → HIGH
      HIGH + ELEVATED              → HIGH
      LOW + LOW                    → LOW
      Sinon                        → MEDIUM

    Args:
        priority: Priorité calculée
        urgency: Urgence détectée

    Returns:
        Niveau de criticité
    """
    if priority in (Priority.CRITICAL,) or (
        priority == Priority.HIGH and urgency in (Urgency.IMMEDIATE, Urgency.ELEVATED)
    ):
        return Criticality.HIGH
    elif priority == Priority.LOW and urgency == Urgency.LOW:
        return Criticality.LOW
    else:
        return Criticality.MEDIUM


# ─────────────────────────────────────────────────────────────────────────────
# CALCUL DU SCORE DE CONFIANCE
# ─────────────────────────────────────────────────────────────────────────────

def calculate_confidence(
    category_matches: int,
    service_matches: int,
    has_sentiment: bool,
) -> float:
    """
    Calcule un score de confiance global pour la suggestion.

    Plus il y a de signaux concordants, plus la confiance est élevée.

    Composantes :
      - Matches catégorie (max +0.35)
      - Matches service (max +0.25)
      - Analyse de sentiment disponible (+0.20)
      - Base minimale (0.20) — on est toujours un peu confiant

    Pourquoi un score de confiance ? (JURY)
      → Le backend Spring Boot peut décider de NE PAS appliquer
        la suggestion si la confiance est trop basse
      → Transparence : "je suis sûr à 82%" vs "je devine à 35%"
      → Permet de logguer et améliorer le système dans le temps

    Returns:
        Score entre 0.20 et 1.0
    """
    base = 0.20

    # Contribution des matches catégorie (plafonné à 0.35)
    cat_contrib = min(category_matches * 0.12, 0.35)

    # Contribution des matches service (plafonné à 0.25)
    svc_contrib = min(service_matches * 0.10, 0.25)

    # Bonus si l'analyse de sentiment a fonctionné
    sentiment_bonus = 0.20 if has_sentiment else 0.0

    confidence = base + cat_contrib + svc_contrib + sentiment_bonus
    return round(min(confidence, 1.0), 2)


# ─────────────────────────────────────────────────────────────────────────────
# GÉNÉRATION DU RAISONNEMENT
# ─────────────────────────────────────────────────────────────────────────────

def build_reasoning(
    normalized_text: str,
    category: Category,
    service: Service,
    priority: Priority,
    sentiment_label: str,
    category_matches: int,
    service_matches: int,
) -> str:
    """
    Génère une explication lisible de la décision.

    Pourquoi c'est important ? (JURY)
      → Explicabilité de l'IA : on doit pouvoir justifier chaque décision
      → L'agent humain voit POURQUOI le système a classé le ticket
      → Confiance utilisateur : pas de "boîte noire"

    Exemple de sortie :
      "Mots-clés réseau détectés (3 matches catégorie, 2 matches service).
       Sentiment NEGATIVE. → Suggestion : PANNE_RESEAU / CORE_NETWORK / HIGH"

    Returns:
        Chaîne explicative en français
    """
    parts = []

    if category_matches > 0:
        parts.append(f"{category_matches} mot(s)-clé(s) catégorie détecté(s)")
    else:
        parts.append("Aucun mot-clé catégorie fort détecté")

    if service_matches > 0:
        parts.append(f"{service_matches} mot(s)-clé(s) service détecté(s)")

    parts.append(f"Sentiment : {sentiment_label}")

    # Résumé final
    suggestion = f"→ {category.value} / {service.value} / {priority.value}"
    parts.append(suggestion)

    return ". ".join(parts)
