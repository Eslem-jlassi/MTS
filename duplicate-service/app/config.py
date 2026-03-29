# =============================================================================
# MTS TELECOM — CONFIGURATION DU MICROSERVICE DE DÉTECTION DE DOUBLONS
# =============================================================================
"""
Ce fichier centralise TOUS les paramètres configurables du microservice.

POURQUOI UN FICHIER DE CONFIGURATION SÉPARÉ ? (JURY)
  → Principe de responsabilité unique (SRP)
  → Modifier un seuil = modifier UN seul fichier
  → Pas de "magic numbers" éparpillés dans le code
  → Facile à adapter en production sans toucher la logique métier

SEUILS DE SIMILARITÉ :
  Ces seuils définissent comment le système interprète les scores de similarité
  cosinus entre deux tickets.

  Score = 1.0 → textes identiques
  Score = 0.0 → textes totalement différents

  Analogie simple :
    Imaginez que chaque ticket est un point dans un espace à N dimensions.
    La similarité cosinus mesure l'angle entre deux points :
    → angle = 0° (même direction) → score = 1.0 → même sujet
    → angle = 90° (perpendiculaires) → score = 0.0 → sujets différents
"""

# ─────────────────────────────────────────────────────────────────────────────
# SEUILS DE SIMILARITÉ
# ─────────────────────────────────────────────────────────────────────────────

# Au-dessus de ce seuil → le ticket est considéré comme un DOUBLON PROBABLE
DUPLICATE_THRESHOLD: float = 0.85

# Au-dessus de ce seuil → le ticket est considéré comme SIMILAIRE (pas doublon)
SIMILAR_THRESHOLD: float = 0.70

# En-dessous de SIMILAR_THRESHOLD → tickets NON liés, on les ignore

# ─────────────────────────────────────────────────────────────────────────────
# DÉTECTION D'INCIDENT DE MASSE
# ─────────────────────────────────────────────────────────────────────────────
"""
LOGIQUE MÉTIER (JURY) :
  Si 3 tickets (ou plus) très similaires sont créés en moins de 24h,
  c'est probablement un incident de masse (panne réseau, coupure service...).

  Pourquoi 3 ? → En-dessous, ça peut être une coïncidence.
  Pourquoi 24h ? → Un incident télécom se manifeste en quelques heures.

  Ces valeurs sont configurables ci-dessous.
"""

# Nombre minimum de tickets similaires pour déclencher l'alerte "incident de masse"
MASS_INCIDENT_MIN_TICKETS: int = 3

# Fenêtre temporelle en heures pour l'analyse d'incident de masse
MASS_INCIDENT_TIME_WINDOW_HOURS: int = 24

# ─────────────────────────────────────────────────────────────────────────────
# RÉSULTATS
# ─────────────────────────────────────────────────────────────────────────────

# Nombre maximum de tickets similaires retournés dans la réponse
MAX_RESULTS: int = 10

# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE D'EMBEDDINGS
# ─────────────────────────────────────────────────────────────────────────────
"""
QUEL MODÈLE ET POURQUOI ? (JURY)

  Modèle : "paraphrase-multilingual-MiniLM-L12-v2"

  C'EST QUOI UN EMBEDDING ?
    Un embedding, c'est transformer un texte en une liste de nombres (vecteur).
    Exemple simplifié :
      "Réseau très lent" → [0.12, -0.45, 0.78, ...]  (384 nombres)
      "Internet lent"    → [0.11, -0.43, 0.76, ...]  (similaire !)
      "Problème facture"  → [-0.32, 0.67, -0.15, ...] (très différent)

    Les textes qui parlent du même sujet ont des vecteurs proches.
    Les textes sur des sujets différents ont des vecteurs éloignés.

  POURQUOI CE MODÈLE ?
    ✓ Multilingue : comprend le français, l'anglais, l'arabe
    ✓ Léger : ~133MB (vs ~1.2GB pour les gros modèles)
    ✓ Rapide : encode un texte en ~10ms
    ✓ Spécialisé paraphrase : détecte que "réseau lent" ≈ "internet lent"
    ✓ Gratuit et open-source (Hugging Face)
    ✓ Éprouvé : ~10M+ téléchargements

  ALTERNATIVE (si mémoire limitée) :
    "all-MiniLM-L6-v2" → anglais seulement, 2x plus rapide, 80MB
"""

MODEL_NAME: str = "paraphrase-multilingual-MiniLM-L12-v2"

# ─────────────────────────────────────────────────────────────────────────────
# NIVEAUX DE SIMILARITÉ (pour l'affichage)
# ─────────────────────────────────────────────────────────────────────────────

DUPLICATE_LEVELS = {
    "HIGH": "Doublon très probable (similarité ≥ 85%)",
    "MEDIUM": "Ticket similaire (similarité ≥ 70%)",
    "LOW": "Ticket possiblement lié (similarité < 70%)",
}

# ─────────────────────────────────────────────────────────────────────────────
# RÉSEAU
# ─────────────────────────────────────────────────────────────────────────────

SERVICE_HOST: str = "0.0.0.0"
SERVICE_PORT: int = 8001
