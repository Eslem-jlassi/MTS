# Lot 3 - Chatbot visible uniquement pour le profil CLIENT

## Objectif du lot

Limiter la bulle chatbot au seul role `CLIENT`, sans toucher au backend chatbot et sans impacter les autres pages de l'application.

## Constat de depart

La bulle chatbot etait montee globalement dans le layout principal, donc potentiellement visible pour tous les utilisateurs authentifies.

Point de montage identifie :

- `client/src/components/layout/MainLayout.tsx`

Composant rendu :

- `client/src/components/chatbot/ChatbotWidget.tsx`

## Corrections appliquees

### 1. Restriction au point de montage global

Dans `MainLayout`, le rendu du chatbot est maintenant conditionne au role authentifie :

- `CLIENT` -> rendu autorise
- `AGENT`, `MANAGER`, `ADMIN` -> rendu bloque

### 2. Garde defensive dans le composant chatbot

Dans `ChatbotWidget`, un garde frontend supplementaire a ete ajoute :

- si aucun utilisateur n'est present
- ou si le role n'est pas `CLIENT`

alors le composant retourne `null`.

Ce deuxieme niveau evite un montage accidentel du chatbot si le composant etait rebranche plus tard ailleurs dans le frontend.

## Fichiers modifies

- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/chatbot/ChatbotWidget.tsx`
- `client/src/components/layout/MainLayout.test.tsx`

## Restriction mise en place

### Rendu global

Fichier :

- `client/src/components/layout/MainLayout.tsx`

Regle :

- `const shouldRenderChatbot = user?.role === UserRole.CLIENT`
- rendu conditionnel : `{shouldRenderChatbot && <ChatbotWidget />}`

### Garde defensive locale

Fichier :

- `client/src/components/chatbot/ChatbotWidget.tsx`

Regle :

- si `authUser` est absent ou si `authUser.role !== UserRole.CLIENT`, retour `null`

## Verifications effectuees

### Tests automatiques

Commande :

```powershell
npm run test:ci -- --runInBand --coverage=false --runTestsByPath src/components/layout/MainLayout.test.tsx
```

Resultat :

- `4/4` tests passes
- chatbot visible pour `CLIENT`
- chatbot absent pour `AGENT`
- chatbot absent pour `MANAGER`
- chatbot absent pour `ADMIN`

### Verification de build

Commande :

```powershell
npm run build
```

Resultat :

- build frontend OK
- warnings `prettier` preexistants, non lies a ce lot

## Risques restants

- aucun impact backend : ce lot est strictement frontend
- le chatbot reste fonctionnel pour `CLIENT`
- les warnings React Router des tests et les warnings `prettier` du build sont preexistants et non bloquants
