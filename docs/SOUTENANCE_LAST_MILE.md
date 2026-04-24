# Soutenance Last Mile

Ce document sert de pense-bete final pour la demo.

## Ce qui est pret

- workflow principal tickets / SLA / incidents / audit
- dashboards par role
- RBAC backend comme source de verite
- services IA specialises relies a l'application
- mode demo et lancement Docker conserves
- UI harmonisee sur les zones critiques de soutenance :
  - manager copilot
  - ticket drawer / detail
  - chatbot
  - badges statut / priorite / SLA

## Ce qui reste volontairement prototype

- certaines briques IA restent heuristiques ou datasets limites
- les services IA locaux restent dependants de l'environnement Python
- les parcours de demo sont prioritaires sur les optimisations de fond

## Points de vigilance demo

- verifier avant passage :
  - frontend accessible
  - backend accessible
  - healthchecks IA OK
  - compte manager fonctionnel pour ALLIE
  - compte agent fonctionnel pour traitement ticket
- preparer un scenario de repli si un service IA local ne demarre pas
- eviter les manipulations destructives hors script de demo
- garder un `.env` stable pendant toute la soutenance

## Message a tenir

- la logique metier critique reste cote backend
- l'interface ne decide pas seule : elle rend un etat calcule ou confirme par les APIs
- ALLIE est un assistant de supervision, pas un chatbot generatif libre
- la validation finale reste humaine sur les actions manager et support
