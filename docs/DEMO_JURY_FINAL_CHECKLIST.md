# Demo Jury Final Checklist

## Avant le jour J

- [ ] Verifier que `README.md` et `docs/DEMO_JURY.md` sont les versions finales
- [ ] Choisir le scenario de lancement : local recommande ou demo rapide H2
- [ ] Verifier les comptes de demo et mots de passe
- [ ] Verifier que le mode demo frontend est desactive sauf si explicitement assume
- [ ] Preparer une copie locale de la checklist et du rapport de readiness

## Lancement

- [ ] Lancer `scripts\\dev\\start-local.bat`
- [ ] Si besoin de fallback rapide : `scripts\\demo\\start-demo-h2.bat`
- [ ] Verifier `http://localhost:3000`
- [ ] Verifier `http://localhost:8080/swagger-ui.html`
- [ ] Verifier `http://127.0.0.1:8000/health`
- [ ] Verifier `http://127.0.0.1:8001/health`
- [ ] Verifier `http://127.0.0.1:8002/health`

## Comptes a preparer

### MySQL / Flyway

- [ ] `admin@mts-telecom.ma / Password1!`
- [ ] `manager@mts-telecom.ma / Password1!`
- [ ] `karim.agent@mts-telecom.ma / Password1!`
- [ ] `layla.agent@mts-telecom.ma / Password1!`
- [ ] `support@atlas-distribution.ma / Password1!`
- [ ] `dsi@sahara-connect.ma / Password1!`

### H2

- [ ] memes emails
- [ ] mot de passe commun : `password`

## Parcours a montrer

### 1. Vision produit

- [ ] expliquer le probleme metier : supervision telecom + support client
- [ ] montrer rapidement l'architecture modulaire
- [ ] insister sur React + Spring Boot + microservices IA + MySQL

### 2. Parcours client

- [ ] connexion client
- [ ] dashboard client
- [ ] creation ticket
- [ ] detail ticket avec SLA et historique
- [ ] ajout commentaire ou piece jointe
- [ ] mentionner que les notes internes sont masquees cote client

### 3. Parcours support

- [ ] connexion manager
- [ ] assignation du ticket a un agent
- [ ] connexion agent
- [ ] prise en charge
- [ ] commentaire
- [ ] changement de statut
- [ ] resolution

### 4. Supervision et pilotage

- [ ] page services
- [ ] monitoring / health
- [ ] incidents
- [ ] SLA
- [ ] dashboard manager
- [ ] rapports ou exports

### 5. Administration

- [ ] connexion admin
- [ ] gestion utilisateurs
- [ ] creation utilisateur interne
- [ ] creation client back-office
- [ ] audit logs
- [ ] politique de suppression professionnelle

### 6. IA

- [ ] sentiment / classification si montre
- [ ] detection de doublons si montre
- [ ] chatbot en francais
- [ ] exemple faible confiance
- [ ] expliquer que le backend orchestre les microservices

## Messages cle a faire passer

- [ ] le backend est la source de verite securite/RBAC
- [ ] le projet ne depend pas du mode demo pour fonctionner
- [ ] le ticketing conserve historique, audit et SLA
- [ ] les suppressions definitives sont protegees
- [ ] la solution est demonstrable et deployable depuis le depot

## A eviter pendant la soutenance

- [ ] ne pas activer le mode demo sans l'annoncer
- [ ] ne pas improviser sur Google OAuth si les credentials reels ne sont pas configures
- [ ] ne pas lancer de script legacy
- [ ] ne pas montrer un endpoint ou un ecran hors perimetre sans l'avoir verifie

## Fallback si un service IA est lent

- [ ] garder le coeur demo sur login, RBAC, tickets, services, audit, dashboards
- [ ] presenter le chatbot apres verification de `http://127.0.0.1:8002/health`
- [ ] si besoin, expliquer que le premier chargement IA peut etre plus lent a cause des modeles

## Validation finale juste avant passage

- [ ] ouvrir 2 a 4 sessions navigateur ou profils de navigation
- [ ] verifier qu'aucun script de test temporaire ne tourne en doublon
- [ ] verifier qu'un ticket de demonstration est disponible ou recreable rapidement
- [ ] garder Swagger ouvert en secours technique
- [ ] garder le README racine et la checklist a portee
