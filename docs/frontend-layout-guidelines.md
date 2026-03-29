# Frontend Layout Guidelines

## Objectif

Stabiliser l'architecture frontend pour eviter les regressions de type double layout (double sidebar, double topbar, double breadcrumb, espaces vides anormaux).

## Source de verite du shell applicatif

- Composant unique: `client/src/components/layout/MainLayout.tsx`
- Montage unique: `client/src/App.tsx` sur la route protegee parente `/`

Le shell global contient uniquement:

- sidebar
- topbar
- breadcrumb
- `Outlet` React Router pour le contenu metier
- chatbot conditionnel client

## Contrat des pages metier

Les pages routees (`/dashboard`, `/tickets`, `/settings`, `/clients`, etc.) doivent rendre uniquement leur contenu metier.

### Autorise

- titre de page metier (`PageHeader`)
- cartes, tableaux, formulaires, filtres, tabs
- overlays metier (modals/drawers) lies a la page

### Interdit dans les pages

- re-injecter une sidebar
- re-injecter une topbar globale
- re-injecter un breadcrumb global
- creer un second shell plein ecran (`min-h-screen`/`h-screen`) qui duplique le shell principal
- appliquer un offset global top (padding/margin) destine au shell

## Separation des responsabilites

- `App.tsx`:
  - definit les routes publiques/protegees
  - monte une seule fois le shell global
- `MainLayout.tsx`:
  - gere toute la structure globale (navigation + zone de contenu)
- pages de `client/src/pages/**`:
  - rendent uniquement le contenu fonctionnel metier

## Chatbot

- Rendu uniquement via le shell global.
- Condition de role: `CLIENT` uniquement.
- Ne pas monter le chatbot dans les pages metier.

## Checklist anti-regression layout

Avant merge frontend, verifier rapidement:

1. `client/src/App.tsx` monte un seul shell global.
2. Aucune page ne reference `MainLayout`/`Breadcrumb`/topbar globale.
3. Aucun style global n'ecrase le positionnement du shell (ex: `position` de `.app-sidebar`).
4. Pas de wrapper plein ecran contradictoire dans une page routee.
5. Le breadcrumb est visible une seule fois dans le shell.

## Commandes de verification

```bash
cd client
npx tsc --noEmit
npm run build
```

Verification manuelle minimale:

- `/dashboard`
- `/tickets`
- `/settings`

Critere de succes:

- une seule sidebar
- une seule topbar
- un seul breadcrumb
- pas d'espace vide anormal au-dessus du contenu