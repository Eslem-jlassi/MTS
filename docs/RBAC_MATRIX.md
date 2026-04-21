# Matrice RBAC

Cette matrice resume le modele RBAC attendu pour la soutenance.

## Source de verite

- Le backend Spring Security est la source de verite :
  - `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`
  - gardes serveur complementaires dans les controllers/services

## Roles

- `CLIENT`
  - compte public uniquement
  - peut s'inscrire publiquement
  - cree et suit ses tickets

- `AGENT`
  - compte interne uniquement
  - traite les tickets, incidents et commentaires selon attribution

- `MANAGER`
  - compte interne uniquement
  - supervise tickets, incidents, SLA, rapports
  - seul role metier autorise a utiliser ALLIE

- `ADMIN`
  - compte interne uniquement
  - gere utilisateurs, clients, configuration sensible et suppressions definitives

## Invariants a preserver

- L'inscription publique est reservee a `CLIENT`.
- `MANAGER`, `AGENT` et `ADMIN` ne sont jamais auto-inscriptibles.
- Le premier `ADMIN` est bootstrap/manual.
- Les admins supplementaires sont crees ou promus par un admin existant.
- La gestion utilisateurs reste admin-only.
- ALLIE ne doit jamais apparaitre dans l'UI admin.
- Les suppressions definitives tickets/incidents/clients restent admin-only avec verification forte.

## Surfaces a verifier

- `CLIENT` : auth publique, tickets, profil, chatbot client
- `AGENT` : tickets assignes, incidents, commentaires
- `MANAGER` : supervision, SLA, rapports, ALLIE
- `ADMIN` : utilisateurs, clients, hard delete, audit, configuration sensible

## Complements utiles

- [Contrats API](API_CONTRACTS.md)
- [Audit auth/RBAC/email](final-audit/02-auth-rbac-email-audit.md)
- [Contrat de non-regression](final-audit/01-non-regression-contract.md)
