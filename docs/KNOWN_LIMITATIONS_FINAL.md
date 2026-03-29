# Known Limitations - Final

## Criticite critique

Aucun blocage critique n'a ete observe sur le chemin de demonstration valide :

- frontend build OK
- backend executable
- parcours critiques verifies en API
- chatbot backend repondant

## Criticite elevee

### 1. Suite backend non totalement verte

- `mvn test` echoue encore sur `DtoValidationTest$TicketCreateRequestTests.nullServiceId`
- impact : la CI backend n'est pas totalement propre
- impact soutenance : faible
- impact release engineering : eleve

### 2. Google OAuth non revalide end-to-end

- le code et les tests unitaires existent
- aucune verification finale en conditions reelles n'a ete faite sans credentials Google actifs
- impact soutenance : faible si non montre
- impact production : eleve si OAuth doit faire partie du scope de livraison immediat

## Criticite moyenne

### 3. Warnings frontend non bloques

- warnings `prettier` / CRLF / BOM dans le build
- warnings React Router v7 et `act(...)` dans les tests
- impact : image de chantier moins propre pour une CI stricte

### 4. Verification WebSocket non faite en ecoute temps reel headless

- les notifications ont ete verifiees via les endpoints API et les compteurs
- la souscription WebSocket temps reel n'a pas ete rejouee manuellement en terminal
- impact : faible pour la soutenance si les notifications UI ont deja ete verifiees en environnement utilisateur

### 5. Services IA non tous re-smoke-testes en live sur ce lot

- le chatbot a ete verifie en live
- `sentiment-service` et `duplicate-service` n'ont pas ete re-smoke-testes manuellement sur ce lot final
- impact : modere seulement si ces deux briques doivent etre demontrees live pendant le jury

## Criticite faible

### 6. Premier demarrage IA potentiellement plus lent

- chargement des modeles et index Python
- impact : demarrage initial plus long, surtout sur machine froide

### 7. Depot encore charge d'historique de chantier

- le depot est proprement documente, mais reste marque par les nombreux lots successifs
- un futur nettoyage Git ou normalisation de formatage pourrait encore ameliorer la presentation

## Candidats de suppression restants a confirmer

Ces elements semblent peu utiles ou redondants, mais ils n'ont pas ete supprimes automatiquement dans ce lot final :

- `.github/appmod/appcat`
- `sentiment-service/START_DEMO.bat`
- `sentiment-service/START_SIMPLE.bat`
- `sentiment-service/TEST_MICROSERVICE.bat`

Ces elements peuvent etre reevalues apres soutenance si aucun usage reel n'est confirme.
