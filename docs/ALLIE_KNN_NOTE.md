# ALLIE - Note KNN

## Role de ALLIE avant cette passe

ALLIE etait deja le copilote manager de MTS Telecom. Il consolidait surtout :

- les tickets actifs et leur priorite
- le risque SLA
- l'etat des services telecom
- les incidents deja ouverts
- les signaux de doublons via `duplicate-service`
- les signaux de frustration / urgence via `sentiment-service`
- les quick actions utiles dans le cockpit manager

Cette logique restait principalement une agregation supervisee de signaux metier cote backend.

## Ce que KNN ajoute maintenant

Une couche de recommandation supervisee explicite a ete ajoutee pour ALLIE.

Objectif :

- rapprocher un ticket manager courant de cas labels connus
- proposer une action suggeree simple et defendable
- montrer des voisins similaires plutot qu'un score opaque

Le KNN ne remplace pas ALLIE. Il renforce le copilote existant avec une recommandation lisible.

## Features utilisees

Le modele utilise un petit jeu de features interpretable :

- `priority`
- `status`
- `age_hours`
- `sla_remaining_minutes`
- `sla_breached`
- `service_degraded`
- `similar_ticket_count`
- `probable_mass_incident`
- `duplicate_confidence`
- `frustration_score`
- `backlog_open_tickets`
- `agent_open_ticket_count`
- `incident_linked`
- `business_impact`
- `service_criticality`
- `assigned`

## Sorties produites

Pour chaque cas manager, ALLIE peut maintenant exposer :

- `predictedAction`
- `confidenceScore`
- `inferenceMode = knn`
- `featureSummary`
- `nearestExamples`
- un raisonnement court base sur les voisins les plus proches

Classes de decision initiales :

- `ESCALATE`
- `REASSIGN`
- `OPEN_INCIDENT`
- `MONITOR`
- `PREPARE_SUMMARY`

## Pourquoi KNN est coherent ici

KNN convient a une premiere version PFE car :

- il est simple a expliquer
- il ne produit pas de score aleatoire
- la recommandation peut etre justifiee par des cas voisins concrets
- il s'integre bien avec un dataset seed local de tickets managers labels

## Validation humaine

La decision finale reste toujours manager.

ALLIE fournit :

- une aide a la priorisation
- une recommandation supervisee
- une confiance calculable
- des exemples voisins

Il ne prend pas de decision irreversible seul.
