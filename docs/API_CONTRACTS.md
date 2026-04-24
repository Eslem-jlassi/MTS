# Contrats API

Ce document sert de point d'entree minimal vers les surfaces API actives du projet.

## Source de verite

- La source de verite fonctionnelle reste le backend Spring Boot sous `server/src/main/java`.
- Les routes publiques et protegees sont principalement definies dans :
  - `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
  - les controllers `server/src/main/java/com/billcom/mts/controller/`

## Surfaces principales

- `AuthController` : connexion, refresh, session bootstrap, register client, verification email
- `TicketController` : creation, consultation, commentaires, historique, SLA, exports, suppression
- `IncidentController` : CRUD supervision, timeline, post-mortem, liaison tickets/services
- `ClientController` : CRUD back-office client, archivage, suppression definitive admin
- `UserController` : gestion interne des utilisateurs et administration
- `NotificationController` : notifications et lecture WebSocket/UI
- `ReportController` : rapports et exports back-office

## Notes de stabilite

- Les routes existantes doivent etre preservees avant soutenance.
- L'auth navigateur reste `cookie-first`.
- Les suppressions definitives admin utilisent une confirmation forte et une verification serveur.

## Complements utiles

- [Matrice RBAC](RBAC_MATRIX.md)
- [Architecture](ARCHITECTURE.md)
- [Audit non-regression](final-audit/01-non-regression-contract.md)
