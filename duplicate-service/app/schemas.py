# =============================================================================
# MTS TELECOM — SCHÉMAS PYDANTIC (Validation entrée / sortie)
# =============================================================================
"""
Ce fichier définit les structures de données échangées par l'API.

RÔLE DE PYDANTIC (JURY) :
  → Valide automatiquement chaque requête entrante
  → Si un champ manque ou a un mauvais type → erreur 422 claire
  → Génère le schéma Swagger/OpenAPI automatiquement
  → Pas besoin de vérifier manuellement chaque champ dans le code

ARCHITECTURE DES SCHÉMAS :
  ┌──────────────────┐
  │  NewTicket        │  Le ticket qu'on veut vérifier
  ├──────────────────┤
  │  RecentTicket     │  Un ticket existant (pour comparaison)
  ├──────────────────┤
  │  DuplicateRequest │  = NewTicket + liste de RecentTicket
  ├──────────────────┤
  │  MatchedTicket    │  Un ticket similaire trouvé (avec score)
  ├──────────────────┤
  │  DuplicateResponse│  Résultat complet de la détection
  ├──────────────────┤
  │  HealthResponse   │  Réponse du endpoint /health
  └──────────────────┘
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# ENTRÉE : Le nouveau ticket à analyser
# ─────────────────────────────────────────────────────────────────────────────

class NewTicket(BaseModel):
    """
    Le ticket qui vient d'être créé par un client.
    C'est lui qu'on compare avec les tickets récents.

    Champs :
      - title : titre du ticket (obligatoire)
      - description : description détaillée (optionnelle)
      - service : service telecom concerné (optionnel)
      - client_id : identifiant du client (optionnel)
      - created_at : date de création (optionnel, défaut = maintenant)
    """
    title: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Titre du nouveau ticket",
        examples=["Réseau très lent depuis ce matin"],
    )
    description: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Description détaillée du problème",
        examples=["Le réseau est très lent sur notre site principal"],
    )
    service: Optional[str] = Field(
        default=None,
        description="Service telecom concerné",
        examples=["Core Network OSS"],
    )
    client_id: Optional[int] = Field(
        default=None,
        description="ID du client qui a créé le ticket",
        examples=[1],
    )
    created_at: Optional[datetime] = Field(
        default=None,
        description="Date de création du ticket",
        examples=["2026-03-08T10:00:00"],
    )

    model_config = {"str_strip_whitespace": True}


# ─────────────────────────────────────────────────────────────────────────────
# ENTRÉE : Un ticket existant (pour comparaison)
# ─────────────────────────────────────────────────────────────────────────────

class RecentTicket(BaseModel):
    """
    Un ticket déjà existant dans la base de données.
    Le backend Spring Boot envoie la liste des tickets récents
    pour qu'on les compare avec le nouveau.

    Pourquoi envoyer la liste depuis Spring Boot ? (JURY)
      → Le microservice Python n'a pas accès à la base de données
      → C'est Spring Boot qui gère la persistance (JPA/Hibernate)
      → Le microservice est "stateless" : il reçoit tout, analyse, retourne
      → Architecture proprement découplée
    """
    id: int = Field(
        ...,
        description="ID du ticket dans la base Spring Boot",
        examples=[101],
    )
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Titre du ticket existant",
        examples=["Lenteur réseau importante depuis 8h"],
    )
    description: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Description du ticket existant",
    )
    service: Optional[str] = Field(
        default=None,
        description="Service telecom du ticket",
        examples=["Core Network OSS"],
    )
    status: Optional[str] = Field(
        default=None,
        description="Statut actuel du ticket (OPEN, IN_PROGRESS, CLOSED...)",
        examples=["OPEN"],
    )
    created_at: Optional[datetime] = Field(
        default=None,
        description="Date de création du ticket",
        examples=["2026-03-08T09:30:00"],
    )

    model_config = {"str_strip_whitespace": True}


# ─────────────────────────────────────────────────────────────────────────────
# ENTRÉE : Requête complète
# ─────────────────────────────────────────────────────────────────────────────

class DuplicateRequest(BaseModel):
    """
    Requête envoyée par le backend Spring Boot.
    Contient le nouveau ticket + la liste des tickets récents à comparer.
    """
    new_ticket: NewTicket = Field(
        ...,
        description="Le nouveau ticket à analyser",
    )
    recent_tickets: list[RecentTicket] = Field(
        ...,
        min_length=1,
        description="Liste des tickets récents pour comparaison",
    )


# ─────────────────────────────────────────────────────────────────────────────
# SORTIE : Un ticket similaire trouvé
# ─────────────────────────────────────────────────────────────────────────────

class MatchedTicket(BaseModel):
    """
    Un ticket qui a été identifié comme similaire au nouveau ticket.

    Contient :
      - ticket_id : l'ID pour le retrouver dans Spring Boot
      - title : le titre (pour l'affichage)
      - similarity_score : le score de similarité cosinus (0.0 à 1.0)
      - duplicate_level : HIGH / MEDIUM / LOW

    Pourquoi un "duplicate_level" ? (JURY)
      → Le score numérique est précis mais peu parlant pour un humain
      → "HIGH" est immédiatement compréhensible
      → L'agent de support voit tout de suite si c'est grave ou pas
    """
    ticket_id: int = Field(
        ...,
        description="ID du ticket similaire",
    )
    title: str = Field(
        ...,
        description="Titre du ticket similaire",
    )
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Score de similarité cosinus (0.0 à 1.0)",
    )
    duplicate_level: str = Field(
        ...,
        description="Niveau : HIGH (≥0.85), MEDIUM (≥0.70), LOW (<0.70)",
        examples=["HIGH"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# SORTIE : Réponse complète
# ─────────────────────────────────────────────────────────────────────────────

class DuplicateResponse(BaseModel):
    """
    Résultat complet de la détection de doublons.

    Champs principaux :
      - is_duplicate : Y a-t-il un doublon probable ?
      - possible_mass_incident : Risque d'incident de masse ?
      - duplicate_confidence : Score du meilleur match
      - matched_tickets : Liste triée des tickets similaires
      - reasoning : Explication en français
      - recommendation : Action recommandée
    """
    is_duplicate: bool = Field(
        ...,
        description="True si un doublon probable a été détecté",
    )
    possible_mass_incident: bool = Field(
        ...,
        description="True si plusieurs tickets similaires suggèrent un incident de masse",
    )
    duplicate_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Score de confiance du meilleur match (0.0 à 1.0)",
    )
    matched_tickets: list[MatchedTicket] = Field(
        default_factory=list,
        description="Liste des tickets similaires trouvés, triés par score décroissant",
    )
    reasoning: str = Field(
        ...,
        description="Explication en français de la décision",
    )
    recommendation: str = Field(
        ...,
        description="Action recommandée pour l'agent de support",
    )


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Réponse du endpoint /health."""
    status: str = Field(default="healthy", examples=["healthy"])
    service: str = Field(default="duplicate-detector", examples=["duplicate-detector"])
    version: str = Field(default="1.0.0", examples=["1.0.0"])
    model_loaded: bool = Field(default=False, description="Modèle d'embeddings chargé ?")
    model_name: str = Field(default="", description="Nom du modèle utilisé")
    mode: str = Field(default="none", description="Mode actif : sentence-transformers, tfidf, ou none")
