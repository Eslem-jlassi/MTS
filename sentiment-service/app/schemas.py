# =============================================================================
# MTS TELECOM — SCHÉMAS PYDANTIC (Validation entrée / sortie)
# =============================================================================
"""
Ce fichier définit les structures de données échangées par l'API.

QU'EST-CE QUE PYDANTIC ? (JURY)
  → Bibliothèque de validation de données pour Python
  → Chaque champ a un type, une contrainte, une description
  → Si le client envoie des données invalides → erreur 422 automatique
  → Génère automatiquement le schéma Swagger/OpenAPI

POURQUOI C'EST IMPORTANT ?
  → Sécurité : on n'accepte pas n'importe quoi
  → Documentation : Swagger montre exactement le format attendu
  → Fiabilité : pas de crash sur des données mal formées
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# REQUÊTE D'ENTRÉE — Ce que Spring Boot envoie
# ─────────────────────────────────────────────────────────────────────────────

class ClassificationRequest(BaseModel):
    """
    Requête envoyée par le backend Spring Boot.

    Champs :
      - title : titre du ticket (obligatoire, 2-500 caractères)
      - description : description détaillée (optionnelle, max 5000 cars)

    Exemple :
      {
        "title": "Réseau très lent",
        "description": "Le réseau est très lent depuis ce matin"
      }
    """
    title: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Titre du ticket client",
        examples=["Réseau très lent depuis ce matin"],
    )
    description: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Description détaillée du problème (optionnelle)",
        examples=["Le réseau est très lent depuis ce matin sur notre site principal"],
    )

    # Pydantic V2 : remplace class Config
    model_config = {"str_strip_whitespace": True}


# ─────────────────────────────────────────────────────────────────────────────
# RÉPONSE DE SORTIE — Ce que Spring Boot reçoit
# ─────────────────────────────────────────────────────────────────────────────

class ClassificationResponse(BaseModel):
    """
    Résultat de la classification renvoyé au backend.

    Champs :
      - category    : catégorie suggérée (ex: PANNE_RESEAU)
      - priority    : priorité suggérée (ex: HIGH)
      - service     : service telecom concerné (ex: CORE_NETWORK)
      - urgency     : niveau d'urgence (ex: ELEVATED)
      - sentiment   : sentiment détecté (ex: NEGATIVE)
      - criticality : criticité métier (ex: HIGH)
      - confidence  : score de confiance entre 0.0 et 1.0
      - reasoning   : explication courte de la décision
    """
    category: str = Field(
        ...,
        description="Catégorie suggérée pour le ticket",
        examples=["PANNE_RESEAU"],
    )
    priority: str = Field(
        ...,
        description="Priorité suggérée",
        examples=["HIGH"],
    )
    service: str = Field(
        ...,
        description="Service telecom concerné",
        examples=["CORE_NETWORK"],
    )
    urgency: str = Field(
        ...,
        description="Niveau d'urgence détecté",
        examples=["ELEVATED"],
    )
    sentiment: str = Field(
        ...,
        description="Sentiment global du client",
        examples=["NEGATIVE"],
    )
    criticality: str = Field(
        ...,
        description="Niveau de criticité métier",
        examples=["HIGH"],
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Score de confiance (0.0 à 1.0)",
        examples=[0.82],
    )
    reasoning: str = Field(
        ...,
        description="Explication courte de la suggestion",
        examples=["Mots-clés réseau/lenteur détectés + sentiment négatif → PANNE_RESEAU / HIGH"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# RÉPONSE HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Réponse du endpoint /health pour monitoring."""
    status: str = Field(default="healthy", examples=["healthy"])
    service: str = Field(default="ticket-classifier", examples=["ticket-classifier"])
    version: str = Field(default="2.0.0", examples=["2.0.0"])
    model_loaded: bool = Field(default=False, description="BERT chargé ?")
    mode: str = Field(default="rules_only", examples=["hybrid", "rules_only"])
