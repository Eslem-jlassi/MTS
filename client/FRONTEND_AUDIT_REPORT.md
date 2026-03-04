# Frontend Code Audit Report — MTS Telecom Supervision System

**Projet**: MTS Telecom - Billcom Consulting PFE 2026  
**Date**: Audit complet du client React + TypeScript  
**Périmètre**: 90+ fichiers frontend (`client/src/`)  
**Severité**: P0 = bloquant, P1 = important, P2 = nice-to-have

---

## Résumé exécutif

| Sévérité | Nombre |
|----------|--------|
| **P0** (bloquant) | 3 |
| **P1** (important) | 25 |
| **P2** (nice-to-have) | 22 |
| **Total** | **50** |

Les principaux axes d'amélioration :
1. **Sécurité** : Demo mode activable en production via URL, tokens localStorage
2. **TypeScript** : `error: any` systématique dans tous les thunks et pages
3. **Scalabilité** : Plusieurs endpoints chargent TOUT côté client (500-1000 items)
4. **Cohérence UI** : Double système de Toast, certaines pages ignorent le design system
5. **Fonctionnalités incomplètes** : Boutons/modales placeholder sans implémentation

---

## P0 — Issues bloquantes

### P0-1 · Demo mode activable via URL en production
**Fichiers** : `src/demo/demoConfig.ts` (L21-30), `src/api/client.ts` (intercepteur)

Le demo mode peut être activé par **n'importe qui** en ajoutant `?demo=true` à l'URL :
```ts
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("demo") === "true") { /* active le mode démo */ }
```
Conséquence : `seedDemoAuth()` injecte un **utilisateur ADMIN hardcodé** (`admin@mts-telecom.ma`) avec un faux JWT (`"demo.jwt.token.mts-telecom-2026"`) dans `localStorage`. L'intercepteur Axios retourne ensuite des données mock pour TOUTES les requêtes, donnant accès à un dashboard admin fonctionnel.

**Recommandation** : Conditionner strictement à `process.env.NODE_ENV !== 'production'` ou retirer complètement le paramètre URL.

---

### P0-2 · `useDarkMode` hook – `Function` type & dépendance inutile dans useEffect
**Fichier** : `src/hooks/useDarkMode.ts` (L75, L106)

```ts
export default function useDarkMode(): [string, Function] { // ← Function est interdit par ESLint/TS
```
Le type de retour utilise `Function` (type global non-typé). De plus, `setTargetTheme` est listé dans les dépendances de `useEffect` alors que c'est un setter de `useState` (stable par référence) — inoffensif mais incorrect.

En outre, ce hook est **dupliqué** avec `ThemeContext.tsx` qui fournit la même fonctionnalité via `useTheme()`. Le hook `useDarkMode` n'est probablement plus utilisé.

**Recommandation** : Supprimer `useDarkMode.ts` (dead code), utiliser uniquement `useTheme()` de `ThemeContext`.

---

### P0-3 · `clientService.createClientFull` retourne objet vide si recherche échoue
**Fichier** : `src/api/clientService.ts` (L94-100)

```ts
const clients = await api.get<Client[]>(`${CLIENTS_PREFIX}/search`, { params: { q: data.email } });
return clients.data?.[0] ?? ({} as Client);  // ← {} as Client = objet vide typé comme Client
```
Si la recherche ne trouve pas le client créé, la fonction retourne un objet vide casté en `Client`. Tout code consommateur qui accède à `.id`, `.clientCode`, etc. recevra `undefined` sans erreur TypeScript.

**Recommandation** : Lever une exception ou retourner `null` avec un type `Client | null`.

---

## P1 — Issues importantes

### P1-1 · `error: any` dans tous les thunks Redux
**Fichiers** : `src/redux/slices/ticketsSlice.ts` (9 occurrences, L157-273), `src/redux/slices/dashboardSlice.ts` (2 occurrences, L35, L48)

Tous les `createAsyncThunk` utilisent `catch (error: any)` :
```ts
} catch (error: any) {
  return rejectWithValue(error.response?.data?.message || "Erreur");
}
```
Alors que `authSlice.ts` utilise correctement `error: unknown` avec `extractErrorMessage()`. L'approche devrait être uniformisée.

**Recommandation** : Refactoriser tous les thunks pour utiliser `error: unknown` + `getErrorMessage()` de `client.ts`.

---

### P1-2 · `err: any` dans les pages
**Fichiers** (10+ occurrences) :
- `src/pages/TicketDetail.tsx` — 7 occurrences (L153, 190, 226, 245, 275, 300)
- `src/pages/AuditLogPage.tsx` (L75)
- `src/pages/IncidentNewPage.tsx` (L111)
- `src/components/tickets/TicketDrawer.tsx` (L286, L310)

**Recommandation** : Utiliser `error: unknown` + `getErrorMessage(error)`.

---

### P1-3 · Unsafe cast `(formData as any)[name]`
**Fichier** : `src/pages/RegisterPage.tsx`

Accès dynamique à l'objet formulaire avec `as any`, contournant le typage.

**Recommandation** : Typer l'objet form avec `Record<string, string>` ou utiliser un type union indexé.

---

### P1-4 · Unsafe cast `(tktRes as any)?.content`
**Fichier** : `src/pages/IncidentNewPage.tsx`

Cast vers `any` pour accéder à `.content` d'une réponse API non typée.

**Recommandation** : Typer la réponse correctement avec `PageResponse<Ticket>`.

---

### P1-5 · Unsafe cast `notifPrefs as Record<string, boolean>`
**Fichier** : `src/pages/SettingsPage.tsx`

Les préférences de notification sont castées sans validation.

---

### P1-6 · `TicketsKanbanPage` charge 500 tickets côté client
**Fichier** : `src/pages/TicketsKanbanPage.tsx`

```ts
const res = await ticketService.getTickets({}, { size: 500 });
```
Charge TOUS les tickets en une seule requête. Aucune pagination serveur.

**Recommandation** : Implémenter la pagination côté serveur ou un endpoint Kanban dédié.

---

### P1-7 · `UsersPage` charge 1000 utilisateurs côté client
**Fichier** : `src/pages/UsersPage.tsx` + `src/api/userService.ts` (L12)

```ts
getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get<PageResponse<UserResponse>>(USERS_PREFIX, { params: { size: 1000 } });
    return response.data.content;
}
```
Le filtrage est entièrement côté client. Ne passera pas à l'échelle.

---

### P1-8 · `IncidentsPage` charge tous les incidents sans pagination
**Fichier** : `src/pages/IncidentsPage.tsx`

Appelle `incidentService.getAll()` sans pagination côté UI.

---

### P1-9 · `NotificationsPage` fetche 100 notifications uniquement pour compter
**Fichier** : `src/pages/NotificationsPage.tsx`

```ts
const res = await notificationService.getNotifications(0, 100);
```
Charge 100 notifications uniquement pour calculer les stats du jour (`todayCount`). Devrait utiliser un endpoint de comptage backend.

---

### P1-10 · Double système de Toast
**Fichiers impliqués** :
- `src/context/ToastContext.tsx` — Toast global via `useToast()`
- `src/components/ui/Toast.tsx` — Composant standalone `ToastContainer`

`TicketDetail.tsx` et `UsersPage.tsx` utilisent le composant `Toast` standalone avec leur propre state local, au lieu du `useToast()` global. Cela crée une incohérence UI (positions différentes, styles légèrement différents).

**Recommandation** : Migrer toutes les pages vers `useToast()` du `ToastContext` et déprécier le `ToastContainer` standalone.

---

### P1-11 · `UsersPage` — Modal "Ajouter" est un placeholder vide
**Fichier** : `src/pages/UsersPage.tsx`

Le bouton "Ajouter un utilisateur" ouvre une modale qui ne contient **aucun formulaire**. C'est un placeholder visible par l'admin.

---

### P1-12 · `UsersPage` — Bouton "Modifier" sans handler
**Fichier** : `src/pages/UsersPage.tsx`

Le bouton edit est rendu mais ne fait rien au click.

---

### P1-13 · `ProfilePage` — Appel API direct hors service layer
**Fichier** : `src/pages/ProfilePage.tsx`

```ts
await api.put("/users/me/change-password", { ... });
```
Contourne `userService.changePassword()` qui existe déjà.

---

### P1-14 · `AdminDashboard` — Appel API direct hors service layer
**Fichier** : `src/pages/dashboard/AdminDashboard.tsx`

```ts
const usersRes = await api.get("/users/count");
```
Devrait utiliser un service dédié.

---

### P1-15 · `ClientDashboard` — Liens incorrects
**Fichier** : `src/pages/dashboard/ClientDashboard.tsx`

- "Chatbot IA" → lien vers `/dashboard` (redirection circulaire)
- "Base de connaissances" → lien vers `/tickets` (incorrect)

---

### P1-16 · `incidentService` retourne `[]` silencieusement en cas d'erreur
**Fichier** : `src/api/incidentService.ts`

Presque toutes les méthodes (`getAll`, `getActive`, `getFiltered`, etc.) ont :
```ts
} catch {
  return [];
}
```
Les erreurs sont avalées — le UI ne peut pas distinguer "0 incidents" de "erreur serveur".

**Recommandation** : Laisser propager l'erreur ou retourner un type discriminé `{ data, error }`.

---

### P1-17 · `managerDashboardAdapter` — Mock de 15% SLA dépassé en dur
**Fichier** : `src/api/managerDashboardAdapter.ts` (L247, L267)

```ts
const breached = Math.round(count * 0.15);  // Mock: on estime que ~15% des tickets sont en SLA dépassé
```
Les services à risque utilisent un pourcentage fixe hardcodé pour simuler les SLA dépassés.

**Recommandation** : Implémenter l'endpoint backend `/dashboard/services-at-risk` avec les vrais chiffres.

---

### P1-18 · Tokens JWT stockés dans `localStorage`
**Fichiers** : `src/api/authService.ts`, `src/api/client.ts`

Les tokens (access + refresh) sont dans `localStorage`, accessibles par n'importe quel script (XSS).

**Recommandation** : Migrer vers `httpOnly` cookies côté backend ou au minimum `sessionStorage`.

---

### P1-19 · `notificationsSlice` — casts `as` non-sécurisés
**Fichier** : `src/redux/slices/notificationsSlice.ts` (thunks L44-90)

```ts
(e as { response?: { data?: { message?: string } } })?.response?.data?.message
```
Casts structurels manuels au lieu d'utiliser `getErrorMessage()`.

---

### P1-20 · `useWebSocketNotifications` — casts `as` multiples sur raw payload
**Fichier** : `src/hooks/useWebSocketNotifications.ts` (L93-110)

La fonction `normalizeNotification` caste chaque champ individuellement :
```ts
id: (raw.id as number) ?? 0,
title: (raw.title as string) ?? "Notification",
```
Devrait utiliser une validation runtime (Zod, io-ts, ou au minimum un type guard).

---

### P1-21 · `Modal` UI — pas de vrai focus trap
**Fichier** : `src/components/ui/Modal.tsx`

Le composant gère `Escape` et `overflow: hidden`, mais n'implémente pas de focus trap (la navigation Tab peut sortir de la modale). Important pour l'accessibilité (WCAG 2.1).

---

### P1-22 · `AuthProps` interface inutilisée
**Fichier** : `src/types/index.ts` (L866-872)

```ts
export interface AuthProps {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  user?: UserResponse;
  setUser?: Dispatch<SetStateAction<UserResponse | undefined>>;
}
```
Pattern prop-drilling non utilisé (l'app utilise Redux). Dead code dans les types.

---

### P1-23 · `AuditLogEntry` (legacy) non supprimé
**Fichier** : `src/types/index.ts` (L795-804)

Marqué `@deprecated Use AuditLog instead` mais toujours exporté.

---

### P1-24 · `DataTable` — rendu par defaut via `Record<string, unknown>`
**Fichier** : `src/components/ui/DataTable.tsx` (L92-97)

```ts
: (row as Record<string, unknown>)[col.key] != null
  ? String((row as Record<string, unknown>)[col.key])
  : "—"
```
Double cast `as Record<string, unknown>` pour le fallback. Devrait utiliser un generic TypeScript bien typé.

---

### P1-25 · Google OAuth Register saute la vérification email
**Fichier** : `src/pages/RegisterPage.tsx`

L'inscription via Google redirige directement vers `/dashboard` au lieu de passer par la vérification email.

---

## P2 — Nice-to-have

### P2-1 · `window.confirm()` pour les suppressions
**Fichiers** :
- `src/pages/SlaPage.tsx` (L324)
- `src/pages/ReportsPage.tsx` (L280)

`window.confirm()` n'est pas stylable et casse l'UX du design system.

**Recommandation** : Utiliser le composant `Modal` du design system pour les confirmations de suppression.

---

### P2-2 · Catch blocks vides / silencieux
**Fichiers** :
- `src/pages/IncidentDetailPage.tsx` — Catch blocks vides lors du chargement de la timeline et des notes
- `src/pages/SlaPage.tsx` — Catch blocks vides dans les opérations CRUD d'escalation
- `src/pages/TicketList.tsx` — Catch silencieux dans `handleExport`
- `src/pages/RegisterPage.tsx` (L104) — `catch (_) {}`

---

### P2-3 · `navigator.platform` (API dépréciée)
**Fichier** : `src/pages/SettingsPage.tsx`

Utilisé pour afficher l'OS de la session. L'API est dépréciée dans les navigateurs modernes.

**Recommandation** : Utiliser `navigator.userAgentData?.platform` avec fallback.

---

### P2-4 · Avatar upload placeholder
**Fichier** : `src/pages/SettingsPage.tsx`

```ts
// "fonctionnalité à venir"
```
Le bouton de changement d'avatar est visible mais ne fait rien.

---

### P2-5 · Timezone non persisté au backend
**Fichier** : `src/pages/SettingsPage.tsx`

Le sélecteur de timezone est local uniquement, pas envoyé au serveur.

---

### P2-6 · `authMockService` — Nom trompeur
**Fichier** : `src/api/authMockService.ts`

Malgré son nom "Mock", ce service fait des **vrais appels API** au backend Spring Boot. Les commentaires le confirment mais le nom crée de la confusion.

**Recommandation** : Renommer en `authExtraService.ts` ou `authRecoveryService.ts`.

---

### P2-7 · TODO comments dans les pages auth
**Fichiers** :
- `src/pages/EmailVerificationPage.tsx` (L45) : `// TODO: Remplacer par l'appel API réel`
- `src/pages/ResetPasswordPage.tsx` (L67) : `// TODO: Remplacer par l'appel API réel`

Ces TODOs sont obsolètes — `authMockService` fait déjà de vrais appels API.

---

### P2-8 · TODO BACKEND comments multiples
**Fichiers** :
- `src/api/dashboardService.ts` (L10) : `TODO BACKEND: supporter en query params`
- `src/api/managerDashboardAdapter.ts` (multiples) : `TODO BACKEND` pour services at risk, team filter
- `src/api/macroService.ts` (L58) : `Mock local — TODO BACKEND`
- `src/context/ThemeContext.tsx` (L45) : `TODO BACKEND: sync with preferences`
- `src/pages/dashboard/ManagerDashboard.tsx` (L614) : `TODO BACKEND: support teamId filter`
- `src/api/userService.ts` (L100) : `TODO BACKEND: POST /api/users/:id/reset-password`

---

### P2-9 · Non-null assertions `!` dans les filtres
**Fichier** : `src/pages/AuditLogPage.tsx`

```ts
filters.page!
```
Forcé via `!` au lieu de valeur par défaut.

---

### P2-10 · Duplicate "Clôturer" button
**Fichier** : `src/pages/IncidentDetailPage.tsx`

Quand un incident est en statut RESOLVED, deux boutons "Clôturer" sont affichés.

---

### P2-11 · `TicketDetail` utilise des modales custom au lieu de `<Modal />`
**Fichier** : `src/pages/TicketDetail.tsx`

Implémente ses propres modales inline au lieu d'utiliser le composant `Modal` du design system.

---

### P2-12 · `ClientsPage` — Stats calculées sur la page courante uniquement
**Fichier** : `src/pages/ClientsPage.tsx`

Les compteurs (actifs, entreprises, etc.) sont calculés sur les clients de la page actuelle, pas sur le total.

---

### P2-13 · Composant `Breadcrumb` — Routes hardcodées
**Fichier** : `src/components/layout/Breadcrumb.tsx`

Le mapping `ROUTE_LABELS` est hardcodé et ne sera pas synchronisé si de nouvelles routes sont ajoutées.

---

### P2-14 · `TelecomService.status` — Union `ServiceStatus | string`
**Fichier** : `src/types/index.ts` (L309)

```ts
status?: ServiceStatus | string;
```
Le `| string` rend le type trop permissif et annule les bénéfices de l'enum.

---

### P2-15 · `useDarkMode` retourne le thème **opposé**
**Fichier** : `src/hooks/useDarkMode.ts`

L'API est contre-intuitive : le premier élément retourné est le thème **opposé** (pour le bouton toggle), pas le thème actif. Combiné avec le type `Function`, ce hook est dangereux.

---

### P2-16 · Bootstrap CSS inclus mais non utilisé par le design system
**Fichier** : `src/bootstrap.css` + `src/bootstrap.css.map`

Le projet utilise Tailwind CSS avec un design system custom (`ds-*` tokens). Bootstrap CSS est inclus mais semble être un vestige.

**Recommandation** : Vérifier et supprimer si non utilisé.

---

### P2-17 · `MainLayout` lit token depuis localStorage directement
**Fichier** : `src/components/layout/MainLayout.tsx` (L131)

```ts
const token = localStorage.getItem("token");
```
Au lieu d'utiliser le token du store Redux (`state.auth.token`).

---

### P2-18 · `Dashboard.tsx` fetch clients avec `size: 100`
**Fichier** : `src/pages/dashboard/Dashboard.tsx`

Pour le filtre dropdown du Manager, charge jusqu'à 100 clients. Devrait utiliser un endpoint de recherche autocomplete.

---

### P2-19 · `clientService.createClientFull` — deux étapes non atomiques
**Fichier** : `src/api/clientService.ts` (L80-100)

Crée un user via `/auth/register` puis cherche le client par email. Si le second appel échoue, le user est créé mais pas trouvé.

---

### P2-20 · `macroService` — commentaire "Mock local" obsolète
**Fichier** : `src/api/macroService.ts` (L58)

Le commentaire dit `Mock local — TODO BACKEND` mais le code fait des vrais appels API vers `/api/quick-replies`.

---

### P2-21 · `MainLayout` — Notifications panel via `useRef` clickOutside custom
**Fichier** : `src/components/layout/MainLayout.tsx`

Implémente sa propre logique de click-outside au lieu d'un hook réutilisable `useClickOutside`.

---

### P2-22 · `SettingsPage` — placeholder phone `+216` hardcodé
**Fichier** : `src/pages/SettingsPage.tsx` (L352)

Le placeholder téléphone est hardcodé pour la Tunisie (`+216 XX XXX XXX`). Devrait être dynamique selon le contexte.

---

## Architecture — Observations générales

### Points positifs
- **RBAC complet** : `usePermissions` hook + `RoleBasedRoute` + sidebar filtrée — cohérent avec la matrice RBAC documentée
- **Types exhaustifs** : 1152 lignes de types, bonne couverture des entités backend
- **Service layer propre** : 14 services API bien structurés avec le pattern prefix/service
- **Redux bien organisé** : 4 slices avec async thunks, typed hooks (`useAppDispatch`, `useAppSelector`)
- **Design system cohérent** : Tokens `ds-*` Tailwind, composants UI réutilisables
- **WebSocket notifications** : STOMP/SockJS intégré pour le temps réel
- **Command Palette** : Ctrl+K pour la navigation rapide
- **Onboarding modal** : Role-based, one-time, non-bloquant
- **Error handling centralisé** : `getErrorMessage()`, `getValidationErrors()`, `getErrorTraceId()` dans `client.ts`
- **Token refresh queue** : Pattern correct pour les 401 concurrents avec `isRefreshing` + `failedQueue`

### Axes d'amélioration principaux
1. **Uniformiser error handling** : `authSlice` et `client.ts` ont le bon pattern — le propager à `ticketsSlice`, `dashboardSlice`, et toutes les pages
2. **Pagination serveur partout** : Migrer TicketsKanban, UsersPage, IncidentsPage vers la pagination serveur
3. **Fusion Toast** : Un seul système de toast global
4. **Retirer demo mode URL param** : Ou le conditionner à `NODE_ENV=development`
5. **Focus trap** dans les modales : Accessibilité WCAG 2.1

---

*Audit réalisé par analyse statique exhaustive de 90+ fichiers frontend.*
