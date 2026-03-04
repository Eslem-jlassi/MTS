# Contrats API — MTS Telecom Supervisor

> Base URL : `http://localhost:8080/api`
> Documentation interactive : [Swagger UI](http://localhost:8080/swagger-ui.html)

---

## Convention générale

| Aspect | Standard |
|--------|----------|
| Format | JSON (`application/json`) |
| Authentification | `Authorization: Bearer <accessToken>` |
| Pagination | `?page=0&size=10&sortBy=createdAt&sortDir=DESC` |
| Réponse paginée | `PageResponse<T>` : `content`, `page`, `size`, `totalElements`, `totalPages`, `first`, `last` |
| Erreurs | RFC 7807 `ProblemDetail` : `type`, `title`, `status`, `detail`, `instance`, `traceId` |

### Exemple de réponse d'erreur

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Le titre du ticket est obligatoire",
  "instance": "/api/tickets",
  "traceId": "a3f2b1c8"
}
```

---

## 1. Authentification (`/api/auth`)

### POST `/api/auth/login` — Connexion

**Accès :** public

```json
// Requête
{
  "email": "admin@billcom.tn",
  "password": "Password1!",
  "rememberMe": false
}

// Réponse 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpc0lzQVJlZnJlc2hUb2tlbg...",
  "tokenType": "Bearer",
  "expiresIn": 900000,
  "user": {
    "id": 1,
    "email": "admin@billcom.tn",
    "firstName": "Admin",
    "lastName": "System",
    "role": "ADMIN",
    "profilePhotoUrl": null,
    "oauthProvider": null
  }
}
```

### POST `/api/auth/register` — Inscription

**Accès :** public

```json
// Requête
{
  "email": "nouveau@entreprise.tn",
  "password": "MotDePasse1!",
  "confirmPassword": "MotDePasse1!",
  "firstName": "Nouveau",
  "lastName": "Utilisateur",
  "phone": "+216 71 000 000",
  "companyName": "Entreprise SA"
}

// Réponse 200 — même format que login (AuthResponse)
```

### POST `/api/auth/refresh` — Rafraîchir le token

```json
// Requête
{ "refreshToken": "dGhpc0lzQVJlZnJlc2hUb2tlbg..." }

// Réponse 200 — nouveau couple accessToken + refreshToken (rotation)
```

### POST `/api/auth/google` — Connexion Google OAuth

```json
// Requête
{ "credential": "<google-id-token>" }

// Réponse 200 — même format AuthResponse
```

### Autres endpoints auth

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/logout` | Déconnexion (invalide le refresh token) |
| GET | `/me` | Informations de l'utilisateur connecté |
| POST | `/forgot-password` | Demande de réinitialisation |
| POST | `/reset-password` | Réinitialisation avec token |
| GET | `/verify-email?token=xxx` | Vérification email |

---

## 2. Tickets (`/api/tickets`)

### POST `/api/tickets` — Créer un ticket

**Accès :** `CLIENT`

```json
// Requête
{
  "title": "Panne facturation BSCS",
  "description": "Les factures ne sont plus générées depuis 14h",
  "serviceId": 1,
  "category": "PANNE",
  "priority": "HIGH"
}

// Réponse 200
{
  "id": 42,
  "ticketNumber": "TK-20260302-0042",
  "title": "Panne facturation BSCS",
  "status": "OPEN",
  "priority": "HIGH",
  "category": "PANNE",
  "serviceName": "BSCS Facturation",
  "clientName": "Ahmed Benali",
  "deadline": "2026-03-02T22:00:00",
  "breachedSla": false,
  "slaPercentage": 0.0,
  "createdAt": "2026-03-02T14:00:00",
  "comments": [],
  "history": [],
  "attachments": []
}
```

### GET `/api/tickets` — Lister les tickets (paginé)

**Accès :** authentifié (filtré selon le rôle)

```
GET /api/tickets?page=0&size=10&status=OPEN&priority=HIGH&sortBy=createdAt&sortDir=DESC
```

```json
// Réponse 200
{
  "content": [
    {
      "id": 42,
      "ticketNumber": "TK-20260302-0042",
      "title": "Panne facturation BSCS",
      "status": "OPEN",
      "priority": "HIGH",
      "serviceName": "BSCS Facturation",
      "clientName": "Ahmed Benali",
      "assignedToName": null,
      "breachedSla": false,
      "createdAt": "2026-03-02T14:00:00"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

### POST `/api/tickets/{id}/status` — Changer le statut

**Accès :** `AGENT`, `MANAGER`, `ADMIN`

```json
// Requête
{ "newStatus": "IN_PROGRESS" }

// Réponse 200 — TicketResponse complet
```

### POST `/api/tickets/{id}/assign` — Assigner un agent

**Accès :** `MANAGER`, `ADMIN`

```json
// Requête
{ "agentId": 3 }

// Réponse 200 — TicketResponse complet
```

### POST `/api/tickets/{id}/comments` — Ajouter un commentaire

**Accès :** authentifié

```json
// Requête
{
  "content": "Le problème est en cours d'investigation",
  "isInternal": true
}

// Réponse 200 — TicketResponse avec le commentaire ajouté
```

### Exports

| Méthode | Route | Format | Accès |
|---------|-------|--------|-------|
| GET | `/export/csv` | CSV | AGENT, MANAGER, ADMIN |
| GET | `/export/excel` | XLSX | AGENT, MANAGER, ADMIN |
| GET | `/export/pdf` | PDF | AGENT, MANAGER, ADMIN |

### Actions en masse (bulk)

| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| POST | `/bulk/assign` | Assigner plusieurs tickets | MANAGER, ADMIN |
| POST | `/bulk/status` | Changer le statut en masse | AGENT, MANAGER, ADMIN |
| POST | `/bulk/priority` | Changer la priorité en masse | AGENT, MANAGER, ADMIN |

### Statistiques tickets

| Méthode | Route | Accès |
|---------|-------|-------|
| GET | `/stats/by-status` | MANAGER, ADMIN |
| GET | `/stats/by-priority` | MANAGER, ADMIN |
| GET | `/stats/avg-resolution` | MANAGER, ADMIN |
| GET | `/stats/sla-compliance` | MANAGER, ADMIN |
| GET | `/sla-breached` | MANAGER, ADMIN |
| GET | `/sla-approaching` | MANAGER, ADMIN |

---

## 3. Dashboard (`/api/dashboard`)

### GET `/api/dashboard/stats` — Statistiques globales

**Accès :** authentifié

```json
// Réponse 200
{
  "totalTickets": 156,
  "activeTickets": 42,
  "resolvedTickets": 89,
  "slaBreachedCount": 7,
  "slaComplianceRate": 95.5,
  "averageResolutionTimeHours": 4.2,
  "ticketsByStatus": {
    "OPEN": 15,
    "IN_PROGRESS": 20,
    "RESOLVED": 89,
    "CLOSED": 32
  },
  "ticketsByPriority": {
    "CRITICAL": 3,
    "HIGH": 12,
    "MEDIUM": 45,
    "LOW": 96
  },
  "trendLast7Days": [
    { "date": "2026-02-24", "created": 5, "resolved": 3, "active": 42 }
  ],
  "agentStats": [
    {
      "agentId": 3,
      "agentName": "Agent Mohamed",
      "assignedTickets": 15,
      "resolvedTickets": 12,
      "averageResolutionTimeHours": 3.5
    }
  ]
}
```

---

## 4. Incidents (`/api/incidents`)

### POST `/api/incidents` — Déclarer un incident

**Accès :** `AGENT`, `MANAGER`, `ADMIN`

```json
// Requête
{
  "title": "Panne complète BSCS",
  "description": "Le serveur BSCS ne répond plus depuis 10h30",
  "severity": "CRITICAL",
  "serviceId": 1,
  "startedAt": "2026-03-02T10:30:00",
  "ticketIds": [42, 43],
  "affectedServiceIds": [1, 3]
}

// Réponse 200
{
  "id": 5,
  "incidentNumber": "INC-005",
  "title": "Panne complète BSCS",
  "severity": "CRITICAL",
  "status": "DETECTED",
  "serviceName": "BSCS Facturation",
  "affectedServiceNames": ["BSCS Facturation", "HLR Abonnés"],
  "ticketNumbers": ["TK-20260302-0042", "TK-20260302-0043"],
  "startedAt": "2026-03-02T10:30:00",
  "createdAt": "2026-03-02T10:35:00"
}
```

### PATCH `/api/incidents/{id}/status` — Mettre à jour le statut

```json
// Requête
{ "status": "INVESTIGATING", "note": "Équipe réseau en cours d'analyse" }
```

### POST `/api/incidents/{id}/post-mortem` — Rédiger le post-mortem

**Accès :** `MANAGER`, `ADMIN`

```json
// Requête
{ "postMortem": "Cause racine : serveur BSCS hors mémoire. Action corrective : augmentation RAM + monitoring." }
```

---

## 5. Services télécom (`/api/services`)

### GET `/api/services/active` — Services actifs

**Accès :** authentifié

```json
// Réponse 200
[
  {
    "id": 1,
    "name": "BSCS Facturation",
    "category": "BILLING",
    "status": "UP",
    "isActive": true,
    "availabilityRate": 99.2
  }
]
```

### GET `/api/services/topology` — Topologie réseau

**Accès :** `AGENT`, `MANAGER`, `ADMIN`

```json
// Réponse 200 — Arbre de dépendances
[
  {
    "id": 1,
    "name": "BSCS Facturation",
    "status": "UP",
    "children": [
      { "id": 3, "name": "HLR Abonnés", "status": "UP", "children": [] }
    ]
  }
]
```

---

## 6. Utilisateurs (`/api/users`)

### GET `/api/users` — Lister les utilisateurs

**Accès :** `MANAGER`, `ADMIN`

```json
// Réponse 200 (paginé)
{
  "content": [
    {
      "id": 1,
      "email": "admin@billcom.tn",
      "firstName": "Admin",
      "lastName": "System",
      "fullName": "Admin System",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00"
    }
  ],
  "totalElements": 6,
  "totalPages": 1
}
```

### PUT `/api/users/{id}/role` — Changer le rôle

**Accès :** `ADMIN`

```json
// Requête
{ "role": "MANAGER" }
```

---

## 7. SLA & Escalade (`/api/sla-policies`, `/api/sla-escalation`)

### POST `/api/sla-policies` — Créer une politique SLA

**Accès :** `ADMIN`

```json
// Requête
{
  "name": "SLA Critical 4h",
  "priority": "CRITICAL",
  "resolutionTimeHours": 4,
  "responseTimeHours": 1,
  "serviceId": null,
  "active": true
}
```

### GET `/api/sla-escalation/stats` — Statistiques d'escalade

**Accès :** `MANAGER`, `ADMIN`

```json
// Réponse 200
{
  "totalEscalations": 12,
  "averageEscalationTimeMinutes": 45,
  "topEscalatedServices": [...]
}
```

---

## 8. Rapports (`/api/reports`)

### POST `/api/reports/generate` — Générer un rapport

**Accès :** `MANAGER`, `ADMIN`

```json
// Requête
{
  "title": "Rapport mensuel février 2026",
  "reportType": "MONTHLY",
  "periodStart": "2026-02-01",
  "periodEnd": "2026-02-28",
  "serviceId": null
}
```

---

## 9. Notifications (`/api/notifications`)

### GET `/api/notifications/unread` — Notifications non lues

**Accès :** authentifié

```json
// Réponse 200
[
  {
    "id": 15,
    "type": "SLA_WARNING",
    "title": "SLA en approche",
    "message": "Le ticket TK-042 atteint 75% du SLA",
    "isRead": false,
    "entityType": "TICKET",
    "entityId": 42,
    "createdAt": "2026-03-02T16:00:00"
  }
]
```

### WebSocket — Notifications temps réel

```
Endpoint STOMP : ws://localhost:8080/ws
Subscribe : /user/queue/notifications
```

---

## 10. Audit (`/api/audit-logs`)

### GET `/api/audit-logs` — Journal d'audit

**Accès :** `ADMIN`

```json
// Réponse 200 (paginé)
{
  "content": [
    {
      "id": 100,
      "entityType": "TICKET",
      "entityId": 42,
      "action": "STATUS_CHANGE",
      "userId": 3,
      "details": "{\"oldStatus\":\"OPEN\",\"newStatus\":\"IN_PROGRESS\"}",
      "ipAddress": "192.168.1.10",
      "timestamp": "2026-03-02T14:30:00"
    }
  ]
}
```

---

## Récapitulatif des endpoints (14 controllers, 100+ routes)

| Domaine | Base path | Routes | Accès principal |
|---------|-----------|--------|-----------------|
| Auth | `/api/auth` | 11 | Public / authentifié |
| Tickets | `/api/tickets` | 26 | Tous rôles (filtrés) |
| Dashboard | `/api/dashboard` | 4 | Authentifié |
| Users | `/api/users` | 11 | ADMIN, MANAGER |
| Services | `/api/services` | 14 | ADMIN (CRUD), tous (lecture) |
| Incidents | `/api/incidents` | 17 | AGENT, MANAGER, ADMIN |
| Reports | `/api/reports` | 10 | MANAGER, ADMIN |
| Notifications | `/api/notifications` | 5 | Authentifié |
| SLA Policies | `/api/sla-policies` | 6 | ADMIN |
| SLA Escalation | `/api/sla-escalation` | 8 | ADMIN, MANAGER |
| Macros | `/api/macros` | 5 | AGENT, MANAGER, ADMIN |
| Business Hours | `/api/business-hours` | 5 | ADMIN, MANAGER |
| Quick Replies | `/api/quick-replies` | 5 | AGENT, MANAGER, ADMIN |
| Audit Logs | `/api/audit-logs` | 4 | ADMIN |
