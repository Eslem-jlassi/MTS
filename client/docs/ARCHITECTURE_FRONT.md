# MTS Telecom – Architecture Frontend cible (refonte UI/UX SaaS)

**Objectif:** Dashboard SaaS premium, pastel soft, Indigo + Orange, Light/Dark.

---

## A) Structure des dossiers cible

```
client/src
├── api/                    # Inchangé (mêmes endpoints)
│   ├── client.ts
│   ├── authService.ts
│   ├── ticketService.ts
│   ├── dashboardService.ts
│   ├── notificationService.ts
│   ├── reportService.ts
│   ├── telecomServiceService.ts
│   ├── clientService.ts
│   └── userService.ts
├── components/
│   ├── layout/             # MainLayout, Sidebar, Topbar, Breadcrumb, PageHeader
│   ├── ui/                  # Design system: Button, Badge, Card, DataTable, Modal, Drawer, EmptyState, Skeleton, Toast
│   ├── notifications/      # NotificationCenter (cloche + dropdown)
│   ├── command/            # CommandPalette (Cmd+K)
│   ├── auth/               # Login, Register, RoleBasedRoute
│   └── tickets/            # CreateTicketModal, etc.
├── context/                # ThemeContext (light/dark persist)
├── hooks/
├── pages/                  # Dashboard*, TicketList, TicketDetail, Clients, Services, Reports, Users, Settings, Profile, Login, Register
├── redux/
├── theme/                  # designTokens (couleurs, typo, spacing, radius, shadows)
├── types/
└── utils/
```

---

## B) Composants à créer / conserver

| Composant | Rôle |
|-----------|------|
| **Button** | Variants: primary (Indigo), accent (Orange), secondary, ghost, danger; sizes: sm, md, lg |
| **Badge** | Statut (success/warning/error/neutral), compteurs, SLA |
| **Card** | Conteneur avec titre optionnel, bordure, ombre (ds-card) |
| **DataTable** | Tri, filtres, pagination, colonnes, actions ligne + bulk |
| **Modal** | Création/édition, confirmation, focus trap |
| **Drawer** | Panneau latéral (preview rapport, filtres) |
| **EmptyState** | Illustration + message + CTA |
| **Skeleton** | Loading listes/cards |
| **PageHeader** | Titre + description + actions |
| **Breadcrumb** | Fil d'Ariane dérivé de la route |
| **NotificationCenter** | Cloche + dropdown notifications (existant, stylé) |
| **CommandPalette** | Cmd+K : recherche globale, navigation tickets/clients/services/rapports |

---

## C) Design tokens (résumé)

- **Primary:** Indigo (#6366F1) – CTA principal, sidebar light (primary-700)
- **Accent:** Orange (#F97316) – CTA secondaire important
- **Success:** Vert pastel (#10B981) – Résolu, OK
- **Warning:** Amber (#F59E0B) – SLA à risque
- **Error:** Rouge soft (#EF4444) – SLA dépassé, erreurs
- **Neutral:** Gray 50–900 (pro look)
- **Dark:** background #0F172A, surface #1E293B, text #F1F5F9 / #CBD5E1

---

## D) Routes existantes (à conserver)

- `/login`, `/register` (public)
- `/` → layout : `/dashboard`, `/tickets`, `/tickets/:id`, `/tickets/new`, `/clients`, `/services`, `/reports`, `/users`, `/profile`, `/settings`

---

## E) Ordre d’implémentation

1. Design tokens + index.css + tailwind + theme
2. Layout (Sidebar primary-700, Topbar, Breadcrumb, PageHeader)
3. UI kit (Button, Badge, Card, Modal, Drawer, EmptyState, Skeleton)
4. NotificationCenter + CommandPalette + Toast global
5. Dashboards par rôle (Client, Agent, Manager, Admin)
6. Pages : Tickets → Ticket Detail → Rapports → Services → Clients → Utilisateurs → Paramètres
