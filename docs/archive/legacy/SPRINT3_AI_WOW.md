# SPRINT 3 AI WOW - Contrats unifies, explicabilite et valeur operationnelle

## Objectif
Sprint 3 implemente un enrichissement IA transverse (microservices Python + gateway backend + frontend) sans rupture des flux existants.

Contraintes respecte:
- zero breaking change
- contrats historiques conserves
- securite/RBAC backend conservee comme source de verite
- pas de regression fonctionnelle sur les parcours existants

## Mini plan 3 lots

### Lot A - Contrat unifie (additif)
- Ajouter des metadonnees explicables communes sur les reponses IA:
  - model_version
  - fallback_mode
  - reasoning_steps[]
  - recommended_actions[]
  - risk_flags[]
  - missing_information[]
  - sources[]
  - latency_ms
- Conserver les champs legacy (ex: duplicate_confidence, reasoning texte court).

### Lot B - Enrichissement metier microservices
- Sentiment: expliquer la categorisation/urgence/priorite, proposer actions, signaler risques, detecter infos manquantes.
- Duplicate: expliquer score/seuils/similarites, proposer fusion/escalade, signaler incident massif probable.
- Chatbot: expliciter fallback, recommandations, risques et traçabilite des sources.

### Lot C - UI explicable et utile
- Normaliser snake_case -> camelCase cote frontend.
- Afficher les sections de valeur agent:
  - etapes de raisonnement
  - actions recommandees
  - risques
  - informations manquantes
  - metadata techniques (version, fallback, latence, sources)

## Contrats avant/apres (resume)

### 1) Sentiment
Avant:
- category, priority, service, urgency, sentiment, criticality, confidence, reasoning

Apres (additif):
- + available
- + model_version
- + fallback_mode
- + reasoning_steps[]
- + recommended_actions[]
- + risk_flags[]
- + missing_information[]
- + sources[]
- + latency_ms

### 2) Duplicate detection
Avant:
- is_duplicate, possible_mass_incident, duplicate_confidence, matched_tickets, reasoning, recommendation

Apres (additif):
- + available
- + confidence (alias unifie)
- + model_version
- + fallback_mode
- + reasoning_steps[]
- + recommended_actions[]
- + risk_flags[]
- + missing_information[]
- + sources[]
- + latency_ms
- legacy duplicate_confidence conserve

### 3) Chatbot
Avant:
- available, message, confidence, response_type, response, analysis, results, massive_incident_candidate

Apres (additif):
- + model_version
- + fallback_mode
- + reasoning_steps[]
- + recommended_actions[]
- + risk_flags[]
- + missing_information[]
- + sources[]
- + latency_ms

### 4) Massive incident detection
Avant:
- evaluated_tickets, candidates_found, candidates[]

Apres (additif):
- + available
- + confidence
- + model_version
- + fallback_mode
- + reasoning_steps[]
- + recommended_actions[]
- + risk_flags[]
- + missing_information[]
- + sources[]
- + latency_ms

## Fichiers Sprint 3 modifies

### Microservices Python
- sentiment-service/app/schemas.py
- sentiment-service/app/classifier.py
- sentiment-service/app/main.py
- duplicate-service/app/schemas.py
- duplicate-service/app/duplicate_detector.py
- duplicate-service/app/main.py
- ai-chatbot/app.py

### Backend Java (DTO + services)
- server/src/main/java/com/billcom/mts/dto/ai/SentimentAnalysisResponseDto.java
- server/src/main/java/com/billcom/mts/dto/ai/DuplicateDetectionResponseDto.java
- server/src/main/java/com/billcom/mts/dto/chatbot/ChatbotResponseDto.java
- server/src/main/java/com/billcom/mts/dto/chatbot/MassiveIncidentDetectionResponseDto.java
- server/src/main/java/com/billcom/mts/service/SentimentAnalysisService.java
- server/src/main/java/com/billcom/mts/service/DuplicateDetectionService.java
- server/src/main/java/com/billcom/mts/service/ChatbotService.java

### Frontend TypeScript/React
- client/src/types/chatbot.ts
- client/src/api/sentimentService.ts
- client/src/api/duplicateService.ts
- client/src/api/chatbotService.ts
- client/src/components/chatbot/chatbotMessageFactory.ts
- client/src/components/chatbot/chatbotSuggestedActionsResolver.ts
- client/src/components/chatbot/ChatbotResponseSections.tsx
- client/src/components/tickets/TicketDrawer.tsx

### Tests Sprint 3
- sentiment-service/tests/test_sprint3_contract_metadata.py
- duplicate-service/tests/test_sprint3_contract_metadata.py
- server/src/test/java/com/billcom/mts/controller/AiSentimentControllerTest.java
- server/src/test/java/com/billcom/mts/controller/AiDuplicateControllerTest.java
- server/src/test/java/com/billcom/mts/controller/ChatbotControllerTest.java
- client/src/api/chatbotService.test.ts
- client/src/components/chatbot/ChatbotResponseSections.test.tsx

## Validation executee

Commandes lancees:
- backend tests cibles: AiSentimentControllerTest, AiDuplicateControllerTest, ChatbotControllerTest
- frontend tests cibles chatbot
- backend package: mvn -DskipTests package
- frontend build: npm run build
- frontend typecheck: npx tsc --noEmit
- python tests sentiment/duplicate/chatbot

Resultats:
- backend tests cibles: PASS
- frontend tests cibles: PASS
- python tests cibles: PASS
- package backend: SUCCESS
- build frontend: SUCCESS (warnings non bloquants)
- typecheck TS: PASS

## Checklist QA Sprint 3
- [ ] Les anciens consommateurs continuent a fonctionner (legacy fields presents)
- [ ] Les nouveaux champs sont presents quand IA disponible
- [ ] Les defaults fallback sont fournis quand IA indisponible
- [ ] Les actions recommandees sont lisibles cote chatbot
- [ ] Les risk flags et missing information sont visibles cote UI
- [ ] Les metadata model/fallback/latency/sources sont affichees
- [ ] Le mapping snake_case -> camelCase est correct
- [ ] Les tests backend/frontend/python Sprint 3 passent

## Plan de rollback
1. Rollback applicatif:
   - revert des commits Sprint 3 (microservices, backend DTO/service, frontend API/UI).
2. Rollback contract frontend:
   - conserver uniquement les champs legacy dans les mappings si necessaire.
3. Rollback backend gateway:
   - desactiver enrichissements additifs et revenir aux DTO minimaux (legacy only).
4. Validation post-rollback:
   - relancer tests cibles backend/frontend/python
   - verifier build backend/frontend

## Note de compatibilite
La strategie Sprint 3 est additive. Les champs existants ne sont pas supprimes et les nouvelles proprietes sont defensivement defaulted pour eviter toute rupture runtime.