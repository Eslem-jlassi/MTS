# =============================================================================
# MTS TELECOM — CONFIGURATION DU MICROSERVICE DE CLASSIFICATION
# =============================================================================
"""
Ce fichier centralise TOUTES les constantes métier du microservice.
Pourquoi un fichier séparé ?
  → Principe de responsabilité unique (SRP)
  → Modifier une règle métier = modifier UN seul fichier
  → Facile à expliquer au jury : "Voici les paramètres du système"

CHOIX TECHNIQUE (JURY) :
  On utilise des Enum Python plutôt que des strings libres.
  Avantage : impossible d'écrire "HIHG" au lieu de "HIGH"
  → Le compilateur attrape les fautes, pas le client en production.
"""

from enum import Enum

# ─────────────────────────────────────────────────────────────────────────────
# ENUMS MÉTIER — Catégories, Priorités, Services, etc.
# ─────────────────────────────────────────────────────────────────────────────

class Category(str, Enum):
    """Catégories possibles d'un ticket telecom."""
    PANNE_RESEAU = "PANNE_RESEAU"
    LATENCE = "LATENCE"
    FACTURATION = "FACTURATION"
    CONFIGURATION = "CONFIGURATION"
    INCIDENT_SERVICE = "INCIDENT_SERVICE"
    DEMANDE_INFORMATION = "DEMANDE_INFORMATION"
    AUTRE = "AUTRE"


class Priority(str, Enum):
    """Niveau de priorité du ticket."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Service(str, Enum):
    """Service telecom concerné par le ticket."""
    CORE_NETWORK = "CORE_NETWORK"
    VOIP_PLATFORM = "VOIP_PLATFORM"
    CRM = "CRM"
    BILLING = "BILLING"
    FTTH = "FTTH"
    CLOUD_VPS = "CLOUD_VPS"
    UNKNOWN = "UNKNOWN"


class Urgency(str, Enum):
    """Niveau d'urgence perçu."""
    LOW = "LOW"
    NORMAL = "NORMAL"
    ELEVATED = "ELEVATED"
    IMMEDIATE = "IMMEDIATE"


class Sentiment(str, Enum):
    """Sentiment global du client."""
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"


class Criticality(str, Enum):
    """Niveau de criticité métier."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ─────────────────────────────────────────────────────────────────────────────
# DICTIONNAIRES DE MOTS-CLÉS MÉTIER
# ─────────────────────────────────────────────────────────────────────────────
"""
POURQUOI DES MOTS-CLÉS ? (JURY)
  → Approche explicable : on sait POURQUOI le système a classé un ticket
  → Pas de "boîte noire" : chaque mot déclenche une règle documentée
  → Facile à enrichir : ajouter un mot = ajouter une ligne
  → Compatible avec le NLP : le sentiment vient de BERT, la classification
    vient des règles + mots-clés → approche HYBRIDE
"""

# Mots-clés → Catégorie
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "PANNE_RESEAU": [
        "panne", "coupure", "down", "hors service", "indisponible",
        "ne marche pas", "ne fonctionne pas", "plus de connexion",
        "réseau", "network", "offline", "déconnecté", "aucun signal",
        "plus de service", "interruption", "tombé",
    ],
    "LATENCE": [
        "lent", "latence", "lag", "délai", "timeout", "slow",
        "lenteur", "ralentissement", "temps de réponse", "ping",
        "débit", "bande passante", "faible vitesse", "très lent",
    ],
    "FACTURATION": [
        "facture", "facturation", "paiement", "montant", "prix",
        "tarif", "abonnement", "prélèvement", "remboursement",
        "erreur de facturation", "surfacturation", "trop cher",
        "impayé", "relance", "crédit", "solde",
    ],
    "CONFIGURATION": [
        "configurer", "configuration", "paramètre", "setup",
        "installer", "installation", "activer", "activation",
        "mot de passe", "accès", "identifiant", "sip", "voip",
        "dns", "ip", "routeur", "firewall", "proxy",
    ],
    "INCIDENT_SERVICE": [
        "incident", "erreur", "bug", "dysfonctionnement", "anomalie",
        "plantage", "crash", "défaillance", "problème technique",
        "ne répond plus", "bloqué", "gelé",
    ],
    "DEMANDE_INFORMATION": [
        "information", "renseignement", "question", "demande",
        "comment faire", "je voudrais savoir", "est-il possible",
        "disponibilité", "offre", "forfait", "catalogue",
    ],
}

# Mots-clés → Service telecom
SERVICE_KEYWORDS: dict[str, list[str]] = {
    "CORE_NETWORK": [
        "réseau", "network", "fibre", "connexion", "signal",
        "antenne", "bande passante", "débit", "ping", "routage",
        "backbone", "transit", "peering",
    ],
    "VOIP_PLATFORM": [
        "voip", "sip", "téléphonie", "appel", "trunk",
        "ligne", "extension", "pbx", "asterisk", "softphone",
        "codec", "rtp", "registrar",
    ],
    "CRM": [
        "crm", "client", "contact", "compte", "fiche client",
        "portail", "espace client", "interface",
    ],
    "BILLING": [
        "facture", "facturation", "paiement", "abonnement",
        "tarif", "prix", "montant", "prélèvement", "billing",
        "remboursement", "solde",
    ],
    "FTTH": [
        "ftth", "fibre optique", "ont", "olt", "splitter",
        "fibre", "optique", "gpon", "xgs-pon",
    ],
    "CLOUD_VPS": [
        "cloud", "vps", "serveur", "hébergement", "vm",
        "machine virtuelle", "datacenter", "sauvegarde", "backup",
        "stockage", "cpu", "ram",
    ],
}

# Mots-clés d'urgence — augmentent la criticité perçue
URGENCY_KEYWORDS: list[str] = [
    "urgent", "immédiat", "critique", "bloquant", "bloqué",
    "tous les utilisateurs", "production", "impossible de travailler",
    "prioritaire", "catastrophe", "grave", "total", "complet",
    "depuis plusieurs jours", "depuis ce matin", "aucun accès",
]

# Mots-clés de colère / frustration — impactent le sentiment
ANGER_KEYWORDS: list[str] = [
    "inadmissible", "inacceptable", "scandaleux", "honte",
    "furieux", "exaspere", "mecontent", "resilier", "arnaque",
    "catastrophique", "nul", "horrible", "pire",
    # Expressions informelles françaises (très courantes dans les tickets)
    "pas possible", "n importe quoi", "ras le bol", "marre",
    "ça suffit", "ca suffit", "j en ai marre", "j en peux plus",
    "insupportable", "lamentable", "honteux", "degoute",
    "agace", "enerve", "enervant", "ridicule", "pitoyable",
    "foutaise", "incompetent", "incompetence", "zero",
    "pourri", "marche pas", "fonctionne pas", "rien ne marche",
    "plus rien", "en colere", "excede",
]

# Négations / plaintes — indiquent un sentiment négatif même sans colère
NEGATIVE_PATTERNS: list[str] = [
    "ne marche pas", "ne fonctionne pas", "pas possible",
    "ne repond pas", "ne s affiche pas", "pas normal",
    "pas acceptable", "pas satisfait", "toujours pas",
    "encore une fois", "depuis des jours", "depuis des semaines",
    "personne ne repond", "aucune reponse", "aucune solution",
    "probleme", "erreur", "echec", "impossible", "bloque",
    "panne", "coupure", "bug", "plantage",
]

# ─────────────────────────────────────────────────────────────────────────────
# PARAMÈTRES DU MODÈLE
# ─────────────────────────────────────────────────────────────────────────────

# Seuils de confiance pour ajuster la priorité
CONFIDENCE_HIGH = 0.75    # Au-dessus → haute confiance
CONFIDENCE_MEDIUM = 0.50  # Entre medium et high → confiance correcte
CONFIDENCE_LOW = 0.30     # En dessous → faible confiance

# Port du microservice
SERVICE_PORT = 8000
SERVICE_HOST = "0.0.0.0"
