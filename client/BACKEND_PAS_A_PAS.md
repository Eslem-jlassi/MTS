# Backend Spring – Modifications pas à pas

Ce document décrit **une par une** les modifications à faire dans ton projet Spring Boot (Spring Tools / Eclipse) pour que le frontend MTS Telecom fonctionne avec toutes les nouvelles fonctionnalités. À chaque numéro, tu modifies **un seul** point ; tu peux t’arrêter après chaque étape et tester.

---

## Prérequis

- Projet Spring Boot (Maven) avec package de base `com.billcom.mts` (ou l’équivalent dans ton projet).
- JWT déjà configuré, CORS avec `allowed-origins: http://localhost:3000, http://localhost:3001`.
- Base de données (JPA/Hibernate) configurée dans `application.yaml`.

---

## 1. Préférences utilisateur (thème, langue, notifications)

**Objectif :** Le frontend pourra un jour appeler `GET/PUT /api/me/preferences` pour synchroniser thème, langue et préférences de notifications.

**Fichiers à créer ou modifier :**

### 1.1 Entité (ou table) des préférences

- **Créer** : `src/main/java/com/billcom/mts/entity/UserPreferences.java`

```java
@Entity
@Table(name = "user_preferences")
public class UserPreferences {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(length = 10)
    private String theme = "light";  // "light" | "dark"

    @Column(length = 5)
    private String language = "fr";   // "fr" | "en"

    @Column(name = "notify_email")
    private Boolean notifyEmail = true;

    @Column(name = "notify_push")
    private Boolean notifyPush = true;

    // getters / setters
}
```

- **Modifier** : ton entité `User` (ex. `src/main/java/.../entity/User.java`)  
  - Ajouter (optionnel) :  
    `@OneToOne(mappedBy = "user", cascade = CascadeType.ALL) private UserPreferences preferences;`

### 1.2 Repository

- **Créer** : `src/main/java/com/billcom/mts/repository/UserPreferencesRepository.java`

```java
public interface UserPreferencesRepository extends JpaRepository<UserPreferences, Long> {
    Optional<UserPreferences> findByUserId(Long userId);
}
```

### 1.3 DTO

- **Créer** : `src/main/java/com/billcom/mts/dto/UserPreferencesDto.java`

```java
public record UserPreferencesDto(
    String theme,
    String language,
    Boolean notifyEmail,
    Boolean notifyPush
) {}
```

### 1.4 Service

- **Créer** : `src/main/java/com/billcom/mts/service/UserPreferencesService.java` (interface)  
  - Méthodes : `UserPreferencesDto getByUserId(Long userId);`  
  - `UserPreferencesDto update(Long userId, UserPreferencesDto dto);`

- **Créer** : `src/main/java/com/billcom/mts/service/impl/UserPreferencesServiceImpl.java`  
  - Implémenter les deux méthodes (créer préférences par défaut si absentes).

### 1.5 Contrôleur

- **Créer** (ou étendre un contrôleur “me”) :  
  `src/main/java/com/billcom/mts/controller/MeController.java`  
  - `GET /api/me/preferences` : utilisateur connecté → `UserPreferencesService.getByUserId(currentUser.getId())`.  
  - `PUT /api/me/preferences` : body = `UserPreferencesDto` → `UserPreferencesService.update(currentUser.getId(), dto)`.

- **Sécuriser** : ces endpoints uniquement pour utilisateur authentifié (JWT).

---

## 2. Dashboard – Filtres (période, service, client)

**Objectif :** L’endpoint des stats du dashboard accepte des paramètres optionnels pour filtrer par période, service et client.

**Fichiers à modifier :**

### 2.1 Contrôleur Dashboard

- **Fichier** : celui qui expose les stats (ex. `DashboardController.java` ou équivalent).  
- **Modifier** la méthode qui sert les stats (ex. `GET /api/dashboard/stats`) pour accepter en **query params** :  
  - `period` : `DAY` | `WEEK` | `MONTH`  
  - `serviceId` : Long (optionnel)  
  - `clientId` : Long (optionnel)

Exemple de signature :

```java
@GetMapping("/stats")
public ResponseEntity<DashboardStatsDto> getStats(
    @RequestParam(required = false) String period,
    @RequestParam(required = false) Long serviceId,
    @RequestParam(required = false) Long clientId,
    Authentication auth
) { ... }
```

### 2.2 Service Dashboard

- **Fichier** : `DashboardService` (ou implémentation).  
- **Modifier** la méthode qui calcule les statistiques pour :  
  - Filtrer les tickets (ou requêtes) selon `period` (date du jour, semaine en cours, mois en cours).  
  - Si `serviceId` non null : filtrer par `service.id`.  
  - Si `clientId` non null : filtrer par `client.id`.  
- Passer ces paramètres du contrôleur au service et adapter les requêtes (criteria, JPA, etc.).

---

## 3. Services – Statut opérationnel (OPERATIONNEL / DEGRADE / PANNE / INACTIF)

**Objectif :** Chaque service télécom a un champ “statut” et le frontend peut le modifier via un PATCH dédié.

**Fichiers à créer ou modifier :**

### 3.1 Enum

- **Créer** (ou ajouter dans le package enums) :  
  `src/main/java/com/billcom/mts/enums/ServiceStatus.java`

```java
public enum ServiceStatus {
    OPERATIONNEL,
    DEGRADE,
    PANNE,
    INACTIF
}
```

### 3.2 Entité TelecomService

- **Fichier** : entité du service télécom (ex. `TelecomService.java` ou `Service.java`).  
- **Ajouter** un champ :  
  `@Enumerated(EnumType.STRING) private ServiceStatus status = ServiceStatus.OPERATIONNEL;`  
  (avec colonne en base, ex. `status` varchar).

### 3.3 DTO

- Dans le DTO de réponse du service (ex. `TelecomServiceDto`), **ajouter** le champ `status` (String ou enum).  
- Pour la mise à jour du statut seul : **créer** un DTO par ex. `UpdateServiceStatusRequest` avec un champ `ServiceStatus status`.

### 3.4 Contrôleur Services

- **Fichier** : contrôleur des services (ex. `TelecomServiceController.java`).  
- **Ajouter** un endpoint :  
  - `PATCH /api/services/{id}/status`  
  - Body : `{ "status": "OPERATIONNEL" | "DEGRADE" | "PANNE" | "INACTIF" }`  
  - Réponse : le service mis à jour (avec `status`).  
- S’assurer que les réponses de `GET /api/services` et `GET /api/services/{id}` incluent le champ `status`.

### 3.5 Service métier

- **Fichier** : `TelecomServiceService` (ou équivalent).  
- **Ajouter** une méthode du type :  
  `TelecomService updateStatus(Long id, ServiceStatus status)`  
  - Vérifier que le service existe, mettre à jour uniquement le champ `status`, sauvegarder.

---

## 4. Clients – Pagination, tri, recherche

**Objectif :** `GET /api/clients` accepte les paramètres de pagination, tri et recherche attendus par le frontend.

**Fichiers à modifier :**

### 4.1 Contrôleur Clients

- **Fichier** : contrôleur des clients (ex. `ClientController.java`).  
- **Modifier** la méthode `GET /api/clients` pour accepter :  
  - `page` (int, défaut 0)  
  - `size` (int, défaut 10)  
  - `sort` (String, ex. `companyName`, `clientCode`, `user.email`)  
  - `direction` : `ASC` | `DESC`  
  - `search` (String, optionnel)  
- Retourner une structure **paginée** (ex. `Page<Client>` ou ton DTO de page) avec au minimum :  
  `content`, `totalElements`, `totalPages`, `number`, `size`, `first`, `last`.

### 4.2 Repository / Service

- **Fichier** : repository ou service qui charge les clients.  
- **Modifier** pour :  
  - Utiliser `Pageable` (avec `sort` et `direction`).  
  - Si `search` non vide : filtrer sur au moins **companyName**, **clientCode**, **email** de l’utilisateur associé (requête JPQL/Criteria ou Specification).

---

## 5. Utilisateurs – Reset password (envoi email) et changement de rôle

**Objectif :** Un admin peut déclencher un envoi d’email de réinitialisation de mot de passe et peut modifier le rôle d’un utilisateur.

**Fichiers à créer ou modifier :**

### 5.1 Reset password

- **Créer** (ou étendre) :  
  - Un service d’envoi d’email (ex. `EmailService` avec méthode `sendPasswordResetEmail(String to, String resetLink)`).  
  - Une logique de génération de token de reset (stocké en base avec une date d’expiration).  
- **Créer** un endpoint (ex. dans `UserController`) :  
  - `POST /api/users/{id}/reset-password`  
  - Réservé aux rôles ADMIN.  
  - Génère un token, enregistre en base, envoie l’email avec un lien contenant le token (lien vers une page frontend du type `/reset-password?token=...`).  
  - Réponse : 204 No Content ou 200 avec message.

### 5.2 Changement de rôle

- **Fichier** : contrôleur des utilisateurs.  
- **Vérifier** qu’il existe un endpoint pour mettre à jour un utilisateur (ex. `PATCH /api/users/{id}` ou `PUT /api/users/{id}`) qui accepte au moins le champ **role** (et éventuellement **isActive**).  
- Si ce n’est pas le cas : **ajouter** (ex. `PATCH /api/users/{id}/role` avec body `{ "role": "ADMIN" | "MANAGER" | "AGENT" | "CLIENT" }`).  
- **Sécuriser** : réservé aux ADMIN.  
- **Service** : mettre à jour l’entité User (role, isActive) et sauvegarder.

---

## 6. Rapports – API cohérente avec le frontend

**Objectif :** Le frontend appelle `GET /api/reports`, `POST /api/reports/upload`, `GET /api/reports/{id}/download` via l’URL de base de l’API (même host/port que le reste).

**Fichiers à vérifier / modifier :**

### 6.1 Base URL

- Le frontend utilise `axios` avec `baseURL = http://localhost:8080/api` (ou variable d’env).  
- **Vérifier** que les endpoints rapports sont bien sous ce préfixe, par ex. :  
  - `GET /api/reports`  
  - `POST /api/reports/upload`  
  - `GET /api/reports/{id}/download`  
- Si ton backend expose actuellement sous un autre préfixe, **aligner** (ex. déplacer sous un `ReportController` avec `@RequestMapping("/api/reports")`).

### 6.2 GET /api/reports

- **Paramètres optionnels** (pour plus tard) : `periodStart`, `periodEnd`, `tag`.  
- **Réponse** : liste (ou page) de rapports avec au moins :  
  `id`, `title`, `description`, `reportType`, `periodStart`, `periodEnd`, `fileName`, `fileSize`, `createdByName`, `downloadCount`, `createdAt`, et si tu gères les tags : `tags`.

### 6.3 POST /api/reports/upload

- **Content-Type** : `multipart/form-data`.  
- **Champs** : `file` (PDF), `title`, `description`, `reportType`, `periodStart`, `periodEnd`, `publish` (optionnel).  
- **Service** : valider le fichier (PDF, taille max), enregistrer en base et le fichier sur disque (ou stockage), incrémenter `downloadCount` à 0.  
- **Réponse** : DTO du rapport créé.

### 6.4 GET /api/reports/{id}/download

- **Réponse** : flux binaire du PDF (ex. `Resource` ou `InputStreamResource`) avec header `Content-Disposition: attachment; filename="..."`.  
- **Optionnel** : incrémenter `downloadCount` pour ce rapport.

---

## 7. Profil – Changement de mot de passe (utilisateur connecté)

**Objectif :** L’utilisateur connecté peut changer son propre mot de passe via un endpoint “me”.

**Fichiers à créer ou modifier :**

### 7.1 Endpoint

- **Fichier** : contrôleur “me” (ex. `MeController.java` utilisé pour les préférences).  
- **Ajouter** :  
  - `PUT /api/me/change-password`  
  - Body : `{ "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }`  
  - Réservé à l’utilisateur authentifié (celui dont le JWT est dans la requête).  
- **Logique** :  
  - Vérifier que `newPassword` et `confirmPassword` sont identiques.  
  - Vérifier que `currentPassword` correspond au mot de passe actuel (hash) de l’utilisateur.  
  - Hasher `newPassword` et mettre à jour l’entité User.  
  - Réponse : 204 ou 200.

### 7.2 DTO

- **Créer** (ex. `ChangePasswordRequest.java`) avec les champs :  
  `currentPassword`, `newPassword`, `confirmPassword`.

---

## Ordre recommandé

1. **Préférences** (étape 1) – si tu veux la synchro thème/langue/notifications plus tard.  
2. **Dashboard filtres** (étape 2).  
3. **Services statut** (étape 3).  
4. **Clients pagination/recherche/tri** (étape 4).  
5. **Utilisateurs reset password + rôle** (étape 5).  
6. **Rapports** (étape 6) – vérifier les URLs et le format des réponses.  
7. **Profil change-password** (étape 7).

Après chaque étape, tu peux tester le frontend : les appels correspondants fonctionneront dès que le backend est aligné avec ce qui est décrit ci-dessus.
