# ADMIN Hard-Delete Rules (Safe by Default)

## Scope
- Tickets
- Incidents
- Clients
- Utilisateurs internes

## Strong confirmation contract (frontend + backend)
- `confirmationKeyword` doit etre exactement `SUPPRIMER`
- `confirmationTargetId` doit correspondre exactement a l'identifiant metier attendu
- Re-auth admin obligatoire :
  - compte local admin : `currentPassword`
  - compte OAuth admin : `verificationCode` email

## Exact identifier by entity
- Ticket : `ticketNumber` (ex: `TK-20240008`)
- Incident : `incidentNumber` (ex: `INC-00077`)
- Client : `clientCode` (ex: `CLI-2026-00044`)
- Utilisateur : email exact du compte (ex: `agent3@mts-telecom.tn`)

## Business safety rules
- La suppression definitive ne doit pas casser la tracabilite metier/audit.
- Si des dependances critiques existent, l'API refuse avec message explicite.
- Alternatives obligatoires dans les messages :
  - Ticket : annulation logique plutot que suppression physique
  - Incident : cloture de l'incident
  - Client : archivage du client
  - Utilisateur : desactivation du compte

## Backend transaction strategy
- Hard-delete execute dans une transaction.
- Les nettoyages prealables sont appliques (relations, notifications, artefacts techniques).
- `flush()` est force apres `delete` pour detecter immediatement les contraintes FK.
- Les conflits de contrainte sont convertis en message metier lisible (pas de crash technique brut).
