# 🔍 MTS Telecom — Microservice de Détection de Doublons

> **Projet PFE** — Microservice Python (FastAPI) qui détecte les tickets d'assistance dupliqués en utilisant l'intelligence artificielle (SentenceTransformers + Similarité Cosinus).

---

## 📋 Table des matières

1. [Architecture](#architecture)
2. [Comment ça marche ? (Explications pédagogiques)](#comment-ça-marche)
3. [Installation & Lancement](#installation--lancement)
4. [Endpoints de l'API](#endpoints-de-lapi)
5. [Exemples avec curl](#exemples-avec-curl)
6. [Intégration Spring Boot (WebClient)](#intégration-spring-boot)
7. [Structure du projet](#structure-du-projet)

---

## Architecture

```
┌──────────┐  REST   ┌──────────────────┐  REST   ┌──────────────────┐
│  React   │ ◀─────▶ │  Spring Boot     │ ──────▶ │  duplicate-      │
│  Client  │   :3000 │  Backend         │   :8001 │  service (IA)    │
│          │         │  (port 8080)     │         │  FastAPI + BERT  │
└──────────┘         └──────────────────┘         └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  sentiment-      │
                     │  service (IA)    │
                     │  (port 8000)     │
                     └──────────────────┘
```

**Flux de données :**
1. Un client crée un ticket dans React
2. React envoie le ticket à Spring Boot (POST /api/tickets)
3. Spring Boot récupère les tickets récents de sa base H2/MySQL
4. Spring Boot appelle **ce microservice** avec le nouveau ticket + les tickets récents
5. Ce microservice renvoie : est-ce un doublon ? un incident de masse ?
6. Spring Boot retourne l'alerte au frontend React

---

## Comment ça marche ?

### 1. Les Embeddings (Plongements de texte)

Un **embedding** transforme un texte en une liste de nombres (un **vecteur**). C'est comme une "empreinte numérique" du *sens* du texte.

```
"Réseau très lent"    → [0.12, -0.45, 0.78, ..., 0.33]  (384 nombres)
"Internet lent"       → [0.11, -0.43, 0.76, ..., 0.31]  (très similaire !)
"Problème de facture" → [-0.32, 0.67, -0.15, ..., 0.89]  (très différent)
```

**Pourquoi ça marche ?** Le modèle a été entraîné sur des millions de paires de phrases. Il a appris que "réseau lent" et "internet lent" veulent dire la même chose, même si les mots sont différents.

### 2. La Similarité Cosinus

Une fois qu'on a les vecteurs, on mesure leur **angle** :

```
                B •
               /
              /  θ = petit angle
             /     → cos(θ) ≈ 1.0
            /       → textes similaires !
     A •───────────

                B •
               |
               |  θ = grand angle
               |    → cos(θ) ≈ 0.0
     A •──────     → textes différents !
```

- **cos(0°) = 1.0** → vecteurs parallèles → textes identiques
- **cos(90°) = 0.0** → vecteurs perpendiculaires → textes sans rapport

La formule : `sim(A, B) = (A · B) / (||A|| × ||B||)`

### 3. Le Modèle : `paraphrase-multilingual-MiniLM-L12-v2`

| Propriété | Valeur |
|-----------|--------|
| Taille | ~133 MB |
| Dimension des embeddings | 384 |
| Langues supportées | 50+ (français, anglais, arabe...) |
| Spécialité | Détection de paraphrases |
| Licence | Apache 2.0 (gratuit et open-source) |
| Temps d'encodage | ~10ms par texte |

**Pourquoi ce modèle ?**
- ✅ **Multilingue** : comprend le français (essentiel pour MTS Telecom)
- ✅ **Paraphrases** : "réseau lent" ≈ "internet lent" ≈ "connexion lente"
- ✅ **Léger** : tourne sur un laptop sans GPU
- ✅ **Rapide** : réponse en <200ms pour 100 tickets

### 4. Les Seuils

| Score | Niveau | Signification |
|-------|--------|---------------|
| ≥ 0.85 | 🔴 HIGH | Doublon très probable |
| ≥ 0.70 | 🟡 MEDIUM | Ticket similaire |
| < 0.70 | - | Pas de lien |

### 5. Détection d'Incident de Masse

Si **3 tickets ou plus** très similaires sont créés en **moins de 24 heures**, le système déclenche une alerte "Incident de Masse".

Exemple : si 5 clients signalent "Réseau lent" le même jour, c'est probablement une panne globale, pas 5 problèmes individuels.

---

## Installation & Lancement

### Prérequis
- Python 3.10+
- pip

### Installation

```bash
cd duplicate-service
pip install -r requirements.txt
```

> ⚠️ Le premier lancement télécharge automatiquement le modèle (~133 MB). Les lancements suivants sont instantanés (modèle en cache).

### Lancement

```bash
cd duplicate-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Vérification

```bash
curl http://localhost:8001/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "service": "duplicate-detector",
  "version": "1.0.0",
  "model_loaded": true,
  "model_name": "paraphrase-multilingual-MiniLM-L12-v2"
}
```

---

## Endpoints de l'API

### GET /health

Vérifie l'état du service et du modèle.

| Champ | Type | Description |
|-------|------|-------------|
| status | string | "healthy" ou "degraded" |
| model_loaded | boolean | Le modèle est-il chargé ? |
| model_name | string | Nom du modèle utilisé |

### POST /detect-duplicates

Détecte les doublons parmi les tickets récents.

**Entrée :**

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| new_ticket | object | ✅ | Le nouveau ticket |
| new_ticket.title | string | ✅ | Titre (2-500 chars) |
| new_ticket.description | string | ❌ | Description |
| new_ticket.service | string | ❌ | Service telecom |
| new_ticket.client_id | integer | ❌ | ID du client |
| new_ticket.created_at | datetime | ❌ | Date de création |
| recent_tickets | array | ✅ | Tickets de comparaison (min: 1) |
| recent_tickets[].id | integer | ✅ | ID du ticket |
| recent_tickets[].title | string | ✅ | Titre |
| recent_tickets[].description | string | ❌ | Description |
| recent_tickets[].service | string | ❌ | Service telecom |
| recent_tickets[].status | string | ❌ | Statut |
| recent_tickets[].created_at | datetime | ❌ | Date de création |

**Sortie :**

| Champ | Type | Description |
|-------|------|-------------|
| is_duplicate | boolean | Doublon probable détecté ? |
| possible_mass_incident | boolean | Incident de masse ? |
| duplicate_confidence | float | Score du meilleur match (0-1) |
| matched_tickets | array | Tickets similaires trouvés |
| reasoning | string | Explication en français |
| recommendation | string | Action recommandée |

---

## Exemples avec curl

### Exemple 1 : Doublon détecté (réseau lent)

```bash
curl -X POST http://localhost:8001/detect-duplicates \
  -H "Content-Type: application/json" \
  -d '{
    "new_ticket": {
      "title": "Réseau très lent depuis ce matin",
      "description": "Le réseau est extrêmement lent sur notre site principal",
      "service": "Core Network OSS",
      "client_id": 1,
      "created_at": "2026-03-08T10:00:00"
    },
    "recent_tickets": [
      {
        "id": 101,
        "title": "Lenteur réseau importante depuis 8h",
        "description": "Le réseau est très lent, toutes les connexions sont affectées",
        "service": "Core Network OSS",
        "status": "OPEN",
        "created_at": "2026-03-08T08:30:00"
      },
      {
        "id": 102,
        "title": "Connexion internet lente",
        "description": "Depuis ce matin, vitesse très basse sur tous nos postes",
        "service": "Core Network OSS",
        "status": "OPEN",
        "created_at": "2026-03-08T09:00:00"
      },
      {
        "id": 103,
        "title": "Erreur facturation mois de mars",
        "description": "La facture du mois de mars contient des erreurs de montant",
        "service": "Billing Platform",
        "status": "OPEN",
        "created_at": "2026-03-07T14:00:00"
      }
    ]
  }'
```

**Réponse attendue :**
```json
{
  "is_duplicate": true,
  "possible_mass_incident": true,
  "duplicate_confidence": 0.92,
  "matched_tickets": [
    {
      "ticket_id": 101,
      "title": "Lenteur réseau importante depuis 8h",
      "similarity_score": 0.92,
      "duplicate_level": "HIGH"
    },
    {
      "ticket_id": 102,
      "title": "Connexion internet lente",
      "similarity_score": 0.85,
      "duplicate_level": "HIGH"
    }
  ],
  "reasoning": "Doublon probable détecté (similarité max : 92%). Plusieurs tickets récents signalent un problème similaire — risque d'incident de masse. Les tickets similaires concernent le même service.",
  "recommendation": "ALERTE : Incident de masse probable. Vérifier immédiatement avec l'équipe technique et notifier le manager. Ce ticket est probablement lié à un problème global."
}
```

### Exemple 2 : Pas de doublon (facture)

```bash
curl -X POST http://localhost:8001/detect-duplicates \
  -H "Content-Type: application/json" \
  -d '{
    "new_ticket": {
      "title": "Erreur sur ma facture du mois de mars",
      "description": "Il y a un problème avec le montant facturé"
    },
    "recent_tickets": [
      {
        "id": 201,
        "title": "Lenteur réseau site nord",
        "description": "Le réseau est lent sur le site nord depuis 2 jours",
        "service": "Core Network OSS",
        "status": "OPEN",
        "created_at": "2026-03-06T10:00:00"
      },
      {
        "id": 202,
        "title": "Installation nouvelle ligne VoIP",
        "description": "On souhaite ajouter une ligne VoIP dans notre bureau",
        "service": "VoIP Platform",
        "status": "IN_PROGRESS",
        "created_at": "2026-03-05T14:00:00"
      }
    ]
  }'
```

**Réponse attendue :**
```json
{
  "is_duplicate": false,
  "possible_mass_incident": false,
  "duplicate_confidence": 0.0,
  "matched_tickets": [],
  "reasoning": "Aucun ticket particulièrement similaire trouvé.",
  "recommendation": "Aucun doublon détecté. Traiter le ticket normalement."
}
```

---

## Intégration Spring Boot

### Appel avec WebClient (Spring WebFlux)

```java
@Service
public class DuplicateDetectionService {

    private final WebClient webClient;

    public DuplicateDetectionService(WebClient.Builder builder) {
        this.webClient = builder
            .baseUrl("http://localhost:8001")
            .build();
    }

    public DuplicateResponse detectDuplicates(Ticket newTicket, List<Ticket> recentTickets) {
        // Construire la requête
        Map<String, Object> newTicketMap = Map.of(
            "title", newTicket.getTitle(),
            "description", newTicket.getDescription() != null ? newTicket.getDescription() : "",
            "service", newTicket.getService() != null ? newTicket.getService() : "",
            "client_id", newTicket.getClientId(),
            "created_at", newTicket.getCreatedAt().toString()
        );

        List<Map<String, Object>> recentTicketsList = recentTickets.stream()
            .map(t -> Map.<String, Object>of(
                "id", t.getId(),
                "title", t.getTitle(),
                "description", t.getDescription() != null ? t.getDescription() : "",
                "service", t.getService() != null ? t.getService() : "",
                "status", t.getStatus().name(),
                "created_at", t.getCreatedAt().toString()
            ))
            .toList();

        Map<String, Object> body = Map.of(
            "new_ticket", newTicketMap,
            "recent_tickets", recentTicketsList
        );

        // Appeler le microservice Python
        return webClient.post()
            .uri("/detect-duplicates")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(DuplicateResponse.class)
            .block();
    }
}
```

### DTO de réponse Java

```java
public record DuplicateResponse(
    boolean isDuplicate,
    boolean possibleMassIncident,
    double duplicateConfidence,
    List<MatchedTicket> matchedTickets,
    String reasoning,
    String recommendation
) {}

public record MatchedTicket(
    int ticketId,
    String title,
    double similarityScore,
    String duplicateLevel
) {}
```

### Appel à la création d'un ticket

```java
@PostMapping("/api/tickets")
public ResponseEntity<?> createTicket(@RequestBody TicketRequest request) {
    // 1. Sauvegarder le ticket
    Ticket saved = ticketService.create(request);

    // 2. Récupérer les tickets récents (dernières 24h)
    List<Ticket> recentTickets = ticketRepository
        .findByCreatedAtAfter(LocalDateTime.now().minusHours(24));

    // 3. Appeler le microservice de détection
    try {
        DuplicateResponse result = duplicateDetectionService
            .detectDuplicates(saved, recentTickets);

        if (result.isDuplicate()) {
            // Ajouter une alerte au ticket
            saved.setDuplicateAlert(result.reasoning());
        }
    } catch (Exception e) {
        // Le service IA est optionnel, on ne bloque pas la création
        log.warn("Détection de doublons indisponible : {}", e.getMessage());
    }

    return ResponseEntity.ok(saved);
}
```

---

## Structure du projet

```
duplicate-service/
├── app/
│   ├── __init__.py            # Package marker
│   ├── config.py              # Seuils, nom du modèle, constantes
│   ├── schemas.py             # Modèles Pydantic (validation entrée/sortie)
│   ├── utils.py               # Fonctions utilitaires (normalisation, etc.)
│   ├── duplicate_detector.py  # Logique IA : embeddings + similarité cosinus
│   └── main.py                # Application FastAPI (endpoints)
├── requirements.txt           # Dépendances Python
└── README.md                  # Ce fichier
```

| Fichier | Rôle | Lignes |
|---------|------|--------|
| config.py | Seuils configurables, nom du modèle | ~90 |
| schemas.py | Validation Pydantic V2 des requêtes/réponses | ~160 |
| utils.py | Normalisation de texte, fonctions pures | ~130 |
| duplicate_detector.py | Pipeline IA complet (encode → compare → décide) | ~280 |
| main.py | Serveur FastAPI, CORS, endpoints | ~120 |

---

## FAQ

**Q: Pourquoi un microservice Python séparé et pas en Java ?**
> SentenceTransformers n'existe qu'en Python. De plus, séparer le NLP du métier permet de scaler et maintenir indépendamment.

**Q: Que se passe-t-il si le modèle ne se charge pas ?**
> Le endpoint `/health` retourne `"status": "degraded"` et `/detect-duplicates` retourne une erreur 503 (Service Unavailable).

**Q: Combien de temps prend le premier lancement ?**
> Le modèle (~133 MB) est téléchargé automatiquement. Ensuite, il est en cache.

**Q: Peut-on fonctionner sans GPU ?**
> Oui, le modèle tourne parfaitement sur CPU. Un GPU accélèrerait mais n'est pas nécessaire.

**Q: Comment changer les seuils ?**
> Modifier `DUPLICATE_THRESHOLD` et `SIMILAR_THRESHOLD` dans `app/config.py`.
