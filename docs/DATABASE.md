# Database - MTS Telecom

## Moteurs de persistence

| Mode | Usage |
|---|---|
| MySQL 8 | base principale, migrations Flyway, demo complete |
| H2 | lancement rapide local via profil `h2` |

Le backend utilise JPA/Hibernate pour les entites et Flyway pour versionner le schema.

## Entites metier actuelles

### Identite, comptes, audit

- `User`
- `Role`
- `RefreshToken`
- `Notification`
- `AuditLog`
- `Company`

### Clients et services

- `Client`
- `TelecomService`
- `ServiceDependency`
- `ServiceStatusHistory`

### Ticketing et SLA

- `Ticket`
- `TicketComment`
- `TicketHistory`
- `TicketAttachment`
- `SlaConfig`
- `SlaTimeline`
- `BusinessHours`
- `EscalationRule`
- `Macro`
- `QuickReplyTemplate`

### Incidents et reporting

- `Incident`
- `IncidentTimeline`
- `Report`

## Organisation logique des donnees

| Domaine | Tables / entites principales |
|---|---|
| Comptes et securite | `users`, `roles`, `refresh_tokens` |
| Clients | `clients`, `companies` |
| Services telecom | `services`, `service_dependency`, `service_status_history` |
| Tickets | `tickets`, `ticket_comments`, `ticket_history`, `ticket_attachments` |
| SLA | `sla_config`, `sla_timeline`, `business_hours`, `escalation_rule` |
| Incidents | `incidents`, `incident_timeline` |
| Exploitation | `notifications`, `reports`, `audit_logs` |
| Aide au traitement | `macros`, `quick_reply_templates` |

## Regles importantes

- l'historique ticket et l'audit doivent rester conserves
- la suppression definitive est bloquee quand elle casserait la tracabilite ou les dependances
- `DELETE /api/tickets/{id}` est une annulation logique, pas une suppression physique
- clients et utilisateurs privilegient archivage / desactivation avant hard delete

## Migrations Flyway

La chaine de migration actuelle va de `V1` a `V34`.

### Jalons principaux

| Version | Contenu |
|---|---|
| `V1` | schema initial |
| `V2` | seed demo MySQL |
| `V10` a `V15` | durcissements auth, roles, notifications, rapports |
| `V16` | suppression des anciennes tables chatbot/messages |
| `V17` | workflow ticket et champs complementaires |
| `V18` | pieces jointes ticket |
| `V19` | macros |
| `V20` | SLA config et warning |
| `V21` | incidents, KPI, topologie |
| `V22` | rapports uploades/generes |
| `V23` | company et audit |
| `V24` a `V33` | indexes, business hours, escalade, quick replies, auth, perfs |
| `V34` | seed complementaire chatbot/services |

### Point important sur le chatbot

Les migrations `V8` et `V9` existent encore dans l'historique parce qu'elles font partie de la chaine legacy, mais les anciennes tables `chatbot_logs` et `messages` ont ete retirees par `V16`.

Le chatbot actuel repose sur le microservice `ai-chatbot` et non sur des tables SQL dediees dans le backend.

## Seeds et donnees de demo

### MySQL / Flyway

- `V2__seed_data.sql`
- mot de passe seed : `Password1!`
- dataset telecom demonstratif pour users, clients, services, tickets, commentaires, historique

### H2

- `DataInitializer`
- mot de passe seed : `password`
- dataset plus compact, coherent avec le domaine telecom

## Fichiers generes et runtime

Le backend peut produire des artefacts locaux :

- rapports dans `server/uploads/reports/`
- fichiers d'avatars utilisateur

Ces sorties ne doivent pas etre considerees comme des sources de verite fonctionnelles du depot.

## Conseils de soutenance

- presenter Flyway comme mecanisme de reproductibilite du schema
- presenter MySQL comme base principale et H2 comme mode demo local
- expliquer que la coherence des donnees sensibles repose sur les regles metier backend, pas sur l'UI
