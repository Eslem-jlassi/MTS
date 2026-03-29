# Lot 2 - Suppression definitive d'un ticket depuis la liste admin

## Objectif du lot

Ajouter une suppression definitive de ticket exploitable depuis la liste des tickets pour l'administrateur, sans modifier les parcours des autres roles et sans fragiliser l'integrite du module ticketing.

## Constat de depart

Le projet disposait deja d'une base partielle :

- bouton de suppression definitive deja present dans la liste frontend pour `ADMIN`
- endpoint backend deja expose sur `DELETE /api/tickets/{id}/hard-delete`
- protection `ADMIN` deja presente cote controleur et securite

Le point faible etait la robustesse de la suppression reelle :

- nettoyage applicatif incomplet avant suppression
- absence de purge explicite des notifications liees
- absence de purge des fichiers physiques lies au ticket
- controle incomplet des dependances metier bloquantes

## Corrections appliquees

### Frontend

- renforcement de la confirmation de suppression definitive dans la liste admin
- affichage explicite de la reference et du titre du ticket
- message d'avertissement irreversibilite plus clair
- fermeture du drawer si le ticket supprime etait ouvert
- tests UI ajoutes pour verifier la visibilite admin-only et la confirmation forte

### Backend

- conservation du endpoint admin-only existant `DELETE /api/tickets/{id}/hard-delete`
- durcissement de la suppression definitive dans `TicketServiceImpl`
- blocage de la suppression si le ticket :
  - n'est pas `NEW`
  - est assigne
  - possede des commentaires
  - possede des pieces jointes
  - possede un historique riche
  - est lie a un incident
  - possede deja un historique SLA
- suppression transactionnelle des notifications liees au ticket
- suppression physique du dossier d'uploads du ticket si present
- audit conserve sur l'action admin

## Endpoint concerne

- `DELETE /api/tickets/{id}/hard-delete`

## Suppression reelle : gestion retenue

La suppression definitive est reservee a l'administrateur et reste volontairement stricte.

Sequence appliquee :

1. verification du role `ADMIN`
2. chargement du ticket cible
3. verification des dependances bloquantes
4. ecriture d'un audit de suppression definitive
5. suppression des notifications liees au ticket
6. suppression du dossier physique `uploads/tickets/<ticketId>` si present
7. suppression reelle de l'entite ticket en base de donnees

Ce choix evite de casser les flux SLA, historique, commentaires, incidents et rapports sur des tickets deja engages dans le cycle de vie metier.

## Fichiers modifies

- `client/src/pages/TicketList.tsx`
- `client/src/pages/TicketList.test.tsx`
- `server/src/main/java/com/billcom/mts/repository/NotificationRepository.java`
- `server/src/main/java/com/billcom/mts/repository/IncidentRepository.java`
- `server/src/main/java/com/billcom/mts/service/impl/TicketServiceImpl.java`
- `server/src/test/java/com/billcom/mts/controller/TicketControllerRbacTest.java`
- `server/src/test/java/com/billcom/mts/service/impl/TicketServiceImplTest.java`

## Fichiers analyses sans modification

- `client/src/api/ticketService.ts`
- `server/src/main/java/com/billcom/mts/controller/TicketController.java`
- `server/src/main/java/com/billcom/mts/service/TicketService.java`
- `server/src/main/java/com/billcom/mts/config/SecurityConfig.java`

## Commandes executees

```powershell
npm run test:ci -- --runInBand --coverage=false --runTestsByPath src/pages/TicketList.test.tsx
mvn test "-Dtest=TicketServiceImplTest,TicketControllerRbacTest"
```

## Tests executes

- frontend : `TicketList.test.tsx` -> `14` tests passes
- backend : `TicketServiceImplTest` + `TicketControllerRbacTest` -> `59` tests passes

## Risques restants

- la suppression definitive reste intentionnellement impossible pour les tickets deja engages dans le traitement ; c'est un choix de securite et d'integrite metier
- les warnings React Router et `act(...)` observes dans les tests frontend sont preexistants et non bloquants
- les logs de tests backend montrent encore des warnings lies a des services mockes (`AuditService`, `NotificationService`), sans impact sur la validite du lot

## Impact metier

- aucun changement pour `CLIENT`, `AGENT` et `MANAGER`
- pour `ADMIN`, la suppression definitive reste disponible uniquement sur les tickets techniquement surs a supprimer
- aucun changement de logique sur le detail ticket, le workflow SLA ou la consultation de liste en dehors du cas de suppression physique admin
