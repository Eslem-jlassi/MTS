# MTS Telecom – Refactor Admin & Modifications Backend

## Étape 1 (livrée) : Thème + design system + sidebar/topbar

### Modifications livrées

- **Thème Light/Dark**
  - `context/ThemeContext.tsx` : état du thème, persistance `localStorage` (clé `theme`), prêt pour sync API `GET/PUT /api/me/preferences`.
  - Toggle dans la topbar (icône Soleil/Lune).
  - `tailwind.config.js` : `darkMode: "class"`.
  - `index.css` : variables CSS pour light/dark.
  - `public/index.html` : script d’init du thème au chargement pour éviter un flash.

- **Design system**
  - `components/ui/Button.tsx` : variants primary, secondary, danger, ghost, outline.
  - `components/ui/Badge.tsx` : variants default, success, warning, danger, info, neutral.
  - `components/ui/Card.tsx` : carte avec padding configurable.
  - `components/ui/Skeleton.tsx` + `SkeletonCard`, `SkeletonTable` : chargement.
  - `components/ui/EmptyState.tsx` : états vides (titre, description, action).

- **Sidebar**
  - Responsive (mobile : overlay ; desktop : fixe).
  - Repliable sur desktop (bouton chevron) : largeur 64 → 20 (icônes seules).
  - Menu admin : Dashboard, Tickets, Clients, Services, Rapports, Utilisateurs, Paramètres, Assistant IA (inchangé).

- **Topbar**
  - Toggle thème (Soleil/Lune).
  - Notifications (inchangé).
  - Avatar + nom + **indication du rôle** (ex. « Administrateur »).
  - Menu dropdown : bloc Rôle, Profil, **Paramètres**, Déconnexion.

---

## Étape 2 (livrée) : Refactor Dashboard Admin

### Modifications livrées

- **Design system** : Dashboard utilise `Card`, `Button`, `Badge`, `SkeletonCard`, `SkeletonTable`, `EmptyState`.
- **KPIs** : Total tickets, Tickets actifs, Résolus ce mois, SLA dépassé, **Taux incidents** (critique + haute) pour Admin/Manager.
- **Filtres** (Admin/Manager) : Période (jour/semaine/mois), Service, Client. Les paramètres sont envoyés à l’API (backend peut les ignorer jusqu’à implémentation).
- **Skeleton** : Pendant le chargement initial (sans stats), grille de `SkeletonCard` + `SkeletonTable`.
- **Empty states** : Erreur avec message + bouton « Réessayer » ; « Aucune donnée » avec bouton « Charger les statistiques ».
- **Dark mode** : Toutes les cartes, tableaux, graphiques et filtres sont en `dark:`.
- **Graphiques** : Tickets par statut, par priorité, incidents par service, charge par agent (Recharts) dans des `Card`.

### Fichiers modifiés

- `client/src/api/dashboardService.ts` : `DashboardFilters` + `getStats(filters?)`.
- `client/src/redux/slices/dashboardSlice.ts` : `fetchDashboardStats(filters?)`.
- `client/src/pages/Dashboard.tsx` : refactor complet (voir ci-dessus).

---

## Étape 3 (livrée) : Refactor Services

### Modifications livrées

- **Design system** : `Card`, `Button`, `Badge`, `EmptyState`, `Skeleton` ; modals et formulaires en dark.
- **Vue double** : **Cartes** et **Table** avec toggle (icônes grille / liste).
- **Filtres** : recherche texte, **catégorie** (toutes + par catégorie), **état** (OPERATIONNEL / DEGRADE / PANNE / INACTIF).
- **Statuts** : enum `ServiceStatus` (OPERATIONNEL, DEGRADE, PANNE, INACTIF) ; changement d’état via select en vue cartes et en vue table.
- **Actions** : créer, éditer, activer/désactiver, **changer état** (select), supprimer.
- **API** : `updateServiceStatus(id, status)` → `PATCH /api/services/:id/status` (voir backend ci-dessous).

### Fichiers modifiés / créés

- `client/src/types/index.ts` : enum `ServiceStatus`, champs/labels/couleurs, `TelecomService.status` optionnel.
- `client/src/api/telecomServiceService.ts` : `updateServiceStatus(id, status)` ; `updateService` accepte `status` dans le body.
- `client/src/pages/ServicesPage.tsx` : refactor complet (cartes + table, filtres, design system, dark).

### Backend (Étape 3)

- **TODO BACKEND** : Exposer **PATCH /api/services/:id/status** avec body `{ "status": "OPERATIONNEL" | "DEGRADE" | "PANNE" | "INACTIF" }`.  
  Sinon, accepter le champ `status` dans **PUT /api/services/:id** (mise à jour partielle) et renvoyer `status` dans les réponses GET.

---

## Checklist « Comment tester » (UI)

1. **Thème**
   - [ ] Cliquer sur l’icône Soleil/Lune dans la topbar : le thème bascule (clair ↔ sombre).
   - [ ] Recharger la page : le dernier thème choisi est conservé (localStorage).
   - [ ] Vérifier que sidebar, header, contenu et modals/dropdowns sont lisibles en clair et en sombre.

2. **Sidebar**
   - [ ] Desktop : cliquer sur le chevron (gauche) : la sidebar se réduit (icônes seules) ; cliquer à nouveau : elle s’élargit.
   - [ ] Mobile : ouvrir le menu hamburger ; la sidebar s’affiche en overlay ; naviguer ou cliquer à l’extérieur la ferme.

3. **Topbar**
   - [ ] Avatar : cliquer ouvre le menu (Profil, Paramètres, Déconnexion) et affiche le rôle (ex. Administrateur).
   - [ ] Cliquer sur « Paramètres » : redirection vers `/settings` (pour l’instant même contenu que dashboard si pas encore de page dédiée).
   - [ ] Déconnexion : redirige vers `/login` et nettoie la session.

4. **Design system (optionnel)**
   - [ ] Les pages qui utiliseront `Button`, `Badge`, `Card`, `Skeleton`, `EmptyState` (étapes suivantes) s’affichent sans régression.

5. **Dashboard (étape 2)**
   - [ ] Connexion en Admin ou Manager : la barre « Filtres » (période, service, client) est visible.
   - [ ] Changer la période ou le service/client : les stats se rechargent (si le backend supporte les paramètres).
   - [ ] Rafraîchir la page : skeleton (cartes + tableau) puis données.
   - [ ] En cas d’erreur API : message clair + bouton « Réessayer ».
   - [ ] Vérifier KPIs (total, actifs, résolus ce mois, SLA, taux incidents), graphiques et tableau de tickets récents en mode clair et sombre.

6. **Services (étape 3)**
   - [ ] Vue **Cartes** et **Table** : le toggle (grille / liste) change l’affichage.
   - [ ] Filtres : recherche, catégorie, **état** (Opérationnel / Dégradé / Panne / Inactif) filtrent correctement.
   - [ ] Changer le statut d’un service (select) : appel API (PATCH status ou PUT avec status) ; si backend pas prêt, erreur attendue.
   - [ ] Créer / éditer / activer-désactiver / supprimer : toasts succès/erreur, liste rafraîchie.
   - [ ] Skeleton au chargement, empty state si aucun service (avec bouton « Créer un service »).
   - [ ] Vérifier en mode clair et sombre.

---

## Modifications backend (Spring / Spring Tools) – une par une

**Guide détaillé pas à pas (fichier par fichier)** : voir **[BACKEND_PAS_A_PAS.md](./BACKEND_PAS_A_PAS.md)**.  
Ce fichier liste pour chaque fonctionnalité les **fichiers Spring à créer ou modifier** (entités, repositories, DTOs, services, contrôleurs) et l’ordre recommandé.

Ci-dessous : **ce que le frontend attend** → **spec des endpoints** (résumé).

---

### 1. Préférences utilisateur (thème, langue, notifications)

- **Frontend**
  - Lecture/écriture du thème en `localStorage` ; plus tard : appel `GET /api/me/preferences` au chargement et `PUT /api/me/preferences` à chaque changement de thème (et langue, notifications).
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - `GET /api/me/preferences` (authentifié)  
      Réponse : `{ "theme": "light" | "dark", "language": "fr" | "en", "notifications": { "email": true, "push": true } }`
    - `PUT /api/me/preferences`  
      Body : `{ "theme"?: "light"|"dark", "language"?: "fr"|"en", "notifications"?: { "email"?: boolean, "push"?: boolean } }`  
      Réponse : même objet que GET.
  - Côté Spring : entité ou table `user_preferences` (userId, theme, language, notifications en JSON ou colonnes), liée à l’utilisateur connecté ; contrôleur sous `/api/me/preferences`, sécurisé par le JWT.

---

### 2. Dashboard – KPIs et filtres (période, service, client)

- **Frontend (étape 2)**
  - Affichera : tickets total/actifs, SLA dépassé, temps moyen résolution, taux incidents, tickets résolus ce mois.
  - Filtres : période (jour/semaine/mois), service, client (paramètres de requête).
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - Endpoint dashboard existant (ex. `GET /api/dashboard/stats` ou similaire) à étendre avec **query params** : `period=DAY|WEEK|MONTH`, `serviceId=`, `clientId=`.
    - Réponse incluant déjà ou à ajouter : `totalTickets`, `activeTickets`, `slaBreachedCount`, `averageResolutionTimeHours`, `resolvedThisMonth`, `ticketsByStatus`, `ticketsByPriority`, `ticketsByService`, `agentStats`, etc.
  - Côté Spring : dans le service qui calcule les stats, brancher les filtres `period`, `serviceId`, `clientId` sur les requêtes (criteria / JPA).

---

### 3. Services – Statut opérationnel (OPERATIONNEL / DEGRADE / PANNE / INACTIF)

- **Frontend (étape 3)**
  - Utilise déjà des statuts type UP/DEGRADED/DOWN/MAINTENANCE en local ; à aligner avec le backend : **OPERATIONNEL**, **DEGRADE**, **PANNE**, **INACTIF**.
  - Actions : créer, éditer, activer/désactiver, **changer le statut** (liste déroulante ou boutons).
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - Entité `TelecomService` (ou équivalent) : ajouter un champ `status` de type enum : `OPERATIONNEL`, `DEGRADE`, `PANNE`, `INACTIF`.
    - `GET /api/services` et `GET /api/services/:id` : inclure `status` dans la réponse.
    - `PATCH` ou `PUT /api/services/:id` : accepter `status` dans le body pour mise à jour.
    - Optionnel : `PATCH /api/services/:id/status` avec body `{ "status": "OPERATIONNEL" | "DEGRADE" | "PANNE" | "INACTIF" }`.
  - Côté Spring : enum `ServiceStatus`, colonne en base, mapping DTO, mise à jour dans le service existant.

---

### 4. Clients – Pagination / tri côté serveur

- **Frontend (étape 4)**
  - Table avec recherche, tri (colonnes), pagination (page, size). Les paramètres seront envoyés en query (ex. `page`, `size`, `sort`, `direction`, `search`).
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - `GET /api/clients?page=0&size=10&sort=companyName&direction=ASC&search=...`  
      Réponse : structure paginée (ex. `PageResponse<Client>` : `content`, `totalElements`, `totalPages`, `size`, `number`, etc.).
    - La recherche `search` s’applique sur au moins : nom d’entreprise, code client, email (selon votre modèle).
  - Côté Spring : contrôleur clients avec `Pageable`, paramètre `search` optionnel ; repository avec `Page<Client>` et critères de tri/filtre.

---

### 5. Utilisateurs – Reset password (envoi email) et assignation de rôles

- **Frontend (étape 5)**
  - Bouton « Réinitialiser le mot de passe » (UI) ; après confirmation, appel API.  
  - Modale ou page d’édition utilisateur : choix du rôle (liste) + enregistrement.
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - `POST /api/users/:id/reset-password` (admin)  
      Body optionnel : `{ "sendEmail": true }` ou sans body.  
      Action : générer un token/lien de reset, envoyer un email à l’utilisateur (template « Réinitialisez votre mot de passe »). Réponse 204 ou 200 avec message.
    - `PATCH /api/users/:id` ou `PUT /api/users/:id`  
      Body : `{ "role": "ADMIN" | "MANAGER" | "AGENT" | "CLIENT" }` (et éventuellement `isActive`).  
      Réponse : utilisateur mis à jour.
  - Côté Spring : endpoint reset-password (génération token, envoi email), endpoint update user avec rôle (sécurisé ADMIN).

---

### 6. Rapports – Upload PDF, listing, téléchargement, tags, filtre par période

- **Frontend (étape 6)**
  - Upload PDF, liste des rapports avec filtre par période (et tags si disponibles), téléchargement.
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - `GET /api/reports?periodStart=...&periodEnd=...&tag=...`  
      Réponse paginée : liste de rapports (id, title, description, reportType, periodStart, periodEnd, fileName, fileSize, createdByName, downloadCount, tags[], createdAt, etc.).
    - `POST /api/reports/upload` (multipart) : `file` (PDF), `title`, `description`, `reportType`, `periodStart`, `periodEnd`, `publish`, `tags` (optionnel, tableau de chaînes).
    - `GET /api/reports/:id/download` : retourne le fichier PDF (stream) avec headers Content-Disposition.
    - Modèle : entité Report avec champs ci-dessus, stockage fichier (filesystem ou blob), table `report_tags` si tags multiples.
  - Côté Spring : contrôleur Reports, service d’upload (validation PDF, taille max), service de listing avec filtres, endpoint download avec `Resource` ou `InputStreamResource`.

---

### 7. Profil & Paramètres – Changer mot de passe, préférences

- **Frontend (étape 7)**
  - **Profil** : affichage infos + formulaire « Changer le mot de passe » (ancien, nouveau, confirmation) → appel API.
  - **Paramètres** : thème (déjà en local, sync avec `PUT /api/me/preferences`), langue (FR/EN), notifications (cases à cocher) → mêmes endpoints préférences que point 1.
- **Backend à faire**
  - **TODO BACKEND**
  - **Spec** :
    - `PUT /api/me/change-password` (authentifié)  
      Body : `{ "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }`  
      Réponse : 204 ou 200. Vérifier l’ancien mot de passe, puis mettre à jour le mot de passe (hash).
    - Préférences : voir point 1 (`GET/PUT /api/me/preferences`).
  - Côté Spring : endpoint `change-password` dans le contrôleur « me » ou « auth », service qui vérifie `currentPassword` et met à jour le hash.

---

## Résumé des endpoints / évolutions backend

| # | Thème / Résumé | Action backend |
|---|----------------|----------------|
| 1 | Préférences (thème, langue, notifications) | Ajouter `GET/PUT /api/me/preferences` + entité préférences |
| 2 | Dashboard filtres | Étendre endpoint stats avec `period`, `serviceId`, `clientId` |
| 3 | Services statut | Ajouter enum `status` (OPERATIONNEL/DEGRADE/PANNE/INACTIF) + PATCH status |
| 4 | Clients | Pagination + tri + paramètre `search` sur GET /api/clients |
| 5 | Utilisateurs | Reset password (email) + PATCH rôle (et isActive) |
| 6 | Rapports | GET avec filtres période/tags, POST upload PDF, GET download + tags en base |
| 7 | Profil / Paramètres | PUT /api/me/change-password ; préférences = point 1 |

---

Les étapes 2 à 7 du frontend (refactor Dashboard, Services, Clients, Utilisateurs, Rapports, Profil & Paramètres) pourront réutiliser ce document : à chaque étape, le frontend appellera les endpoints ou paramètres listés ci-dessus ; vous pourrez implémenter la modification backend correspondante dans Spring Tools une par une.
