# Lot 4 - Amelioration UX du chatbot, animation et reponse bilingue

## Objectif du lot
- Moderniser la bulle flottante du chatbot sans alourdir le widget.
- Uniformiser les textes visibles du chatbot.
- Garantir une reponse en francais ou en anglais selon la langue du client.
- Conserver les flows existants : analyse IA, suggestions, doublons, brouillon ticket.

## Composants identifies
- Bulle flottante et panneau :
  - `client/src/components/chatbot/ChatbotWidget.tsx`
  - `client/src/components/chatbot/ChatbotStyles.css`
  - `client/src/components/chatbot/ChatbotMascot.tsx`
- Saisie, messages, sections et suggestions :
  - `client/src/components/chatbot/ChatInput.tsx`
  - `client/src/components/chatbot/ChatMessage.tsx`
  - `client/src/components/chatbot/ChatbotResponseSections.tsx`
  - `client/src/components/chatbot/ChatbotSuggestedActionsView.tsx`
  - `client/src/components/chatbot/ChatbotPromptChips.tsx`
  - `client/src/components/chatbot/ChatbotTicketDraftPanel.tsx`
- Couche conversation / langue / copywriting :
  - `client/src/components/chatbot/useChatbotConversation.ts`
  - `client/src/components/chatbot/chatbotConversation.ts`
  - `client/src/components/chatbot/chatbotLanguage.ts`
  - `client/src/components/chatbot/chatbotCopy.ts`
  - `client/src/components/chatbot/chatbotPrompts.ts`
  - `client/src/components/chatbot/chatbotMessageFactory.ts`
  - `client/src/components/chatbot/chatbotSuggestedActionsResolver.ts`
  - `client/src/components/chatbot/chatbotTicketDraft.ts`
  - `client/src/components/chatbot/chatbotAnswerLocalization.ts`
- Services API :
  - `client/src/api/chatbotService.ts`
  - `server/src/main/java/com/billcom/mts/controller/ChatbotController.java`
  - `server/src/main/java/com/billcom/mts/service/ChatbotService.java`
  - `server/src/main/java/com/billcom/mts/dto/chatbot/ChatbotRequestDto.java`
  - `ai-chatbot/app.py`
  - `ai-chatbot/chat_response_builder.py`

## Corrections apportees

### UX de la bulle
- Refonte de la bulle flottante avec une apparence plus premium :
  - gradient plus riche
  - halo discret
  - mini orbes animees
  - noyau interne plus lisible
- Animation legere avec `framer-motion` :
  - flottement doux en boucle
  - hover subtil
  - tap compact
- Ajout d'une mascotte robot douce :
  - image externe possible via `REACT_APP_CHATBOT_MASCOT_URL`
  - fallback natif en CSS/vector si aucun asset n'est fourni ou si le chargement echoue
- Le panneau conserve sa structure existante, avec header, intro, messages et brouillon ticket.

### Uniformisation des textes visibles
- Centralisation des textes UI FR/EN dans `chatbotCopy.ts`.
- Centralisation des prompts rapides FR/EN dans `chatbotPrompts.ts`.
- Alignement des placeholders, labels, erreurs, suggestions, actions et messages de brouillon sur la langue courante.

### Strategie bilingue
- Detection initiale cote frontend avec heuristiques simples et robustes dans `chatbotLanguage.ts`.
- La langue detectee est envoyee au backend via `preferred_language`.
- Le backend Spring transmet cette preference au microservice Python.
- Le microservice IA confirme la langue finale avec `resolve_response_language(...)` et renvoie `response_language`.
- Le frontend garde cette langue comme source de verite pour :
  - les messages systeme
  - les suggestions d'action
  - les placeholders
  - les libelles des sections d'analyse
  - les messages d'erreur
- Une normalisation legere d'affichage reste presente cote frontend pour corriger la ponctuation et certains labels si une reponse heuristique reste melangee.

### Preservation des flows existants
- Aucun changement de role.
- Aucun changement du montage reserve au `CLIENT`.
- Pas de regression introduite sur :
  - propositions IA
  - suggestions d'actions
  - detection de service
  - brouillon ticket
  - detection d'incident massif

## Fichiers modifies

### Frontend
- `client/src/api/chatbotService.ts`
- `client/src/types/chatbot.ts`
- `client/src/components/chatbot/ChatInput.tsx`
- `client/src/components/chatbot/ChatMessage.tsx`
- `client/src/components/chatbot/ChatbotMascot.tsx`
- `client/src/components/chatbot/ChatbotPromptChips.tsx`
- `client/src/components/chatbot/ChatbotResponseSections.tsx`
- `client/src/components/chatbot/ChatbotStyles.css`
- `client/src/components/chatbot/ChatbotSuggestedActionsView.tsx`
- `client/src/components/chatbot/ChatbotTicketDraftPanel.tsx`
- `client/src/components/chatbot/ChatbotWidget.tsx`
- `client/src/components/chatbot/chatbotAnswerLocalization.ts`
- `client/src/components/chatbot/chatbotConversation.ts`
- `client/src/components/chatbot/chatbotCopy.ts`
- `client/src/components/chatbot/chatbotLanguage.ts`
- `client/src/components/chatbot/chatbotMessageFactory.ts`
- `client/src/components/chatbot/chatbotPrompts.ts`
- `client/src/components/chatbot/chatbotSuggestedActionsResolver.ts`
- `client/src/components/chatbot/chatbotTicketDraft.ts`
- `client/src/components/chatbot/useChatbotConversation.ts`

### Tests frontend
- `client/src/api/chatbotService.test.ts`
- `client/src/components/chatbot/ChatbotPromptChips.test.tsx`
- `client/src/components/chatbot/ChatbotResponseSections.test.tsx`
- `client/src/components/chatbot/chatbotLanguage.test.ts`
- `client/src/components/chatbot/chatbotMessageFactory.test.ts`
- `client/src/components/chatbot/chatbotSuggestedActions.test.ts`
- `client/src/components/chatbot/useChatbotConversation.test.ts`

### Backend Spring
- `server/src/main/java/com/billcom/mts/controller/ChatbotController.java`
- `server/src/main/java/com/billcom/mts/dto/chatbot/ChatbotRequestDto.java`
- `server/src/main/java/com/billcom/mts/service/ChatbotService.java`
- `server/src/test/java/com/billcom/mts/controller/ChatbotControllerTest.java`

### Microservice Python
- `ai-chatbot/app.py`
- `ai-chatbot/chat_response_builder.py`
- `ai-chatbot/test_chat_response_builder.py`

## Tests executes
- Frontend cible :
  - `npm run test:ci -- --runInBand --coverage=false --runTestsByPath src/components/chatbot/useChatbotConversation.test.ts src/components/chatbot/chatbotMessageFactory.test.ts src/components/chatbot/ChatbotResponseSections.test.tsx src/components/chatbot/ChatbotPromptChips.test.tsx src/components/chatbot/chatbotSuggestedActions.test.ts src/components/chatbot/chatbotLanguage.test.ts src/api/chatbotService.test.ts`
  - Resultat : `7` suites, `32` tests, tous passes
- Build frontend :
  - `npm run build`
  - Resultat : build OK avec warnings `prettier/prettier` deja presents hors perimetre strict du lot
- Backend Spring :
  - `mvn test "-Dtest=ChatbotControllerTest"`
  - Resultat : `2` tests passes
- Microservice Python :
  - `& '..\.venv\Scripts\python.exe' -m unittest discover -s . -p 'test_*.py'`
  - Resultat : `5` tests passes

## Risques restants
- La detection FR/EN reste heuristique : elle est fiable pour le cadre soutenance, mais ne remplace pas un moteur de language detection plus avance.
- Le build frontend remonte encore des warnings de formatage deja presents ailleurs dans le projet.
- La mascotte image externe depend d'un `REACT_APP_CHATBOT_MASCOT_URL` valide ; en l'absence d'asset, le fallback CSS est utilise proprement.

## Conclusion
- La bulle chatbot est plus moderne, plus vivante et plus soutenance-ready.
- L'experience visible reste legere et performante.
- La reponse bilingue est maintenant coherente de bout en bout entre UI, passerelle Spring et microservice Python.
