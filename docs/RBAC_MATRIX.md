# MTS Telecom - Matrice RBAC (Role-Based Access Control)

**Date**: 28 février 2026  
**Version**: 1.0  
**Auteur**: Billcom Consulting

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Rôles et hiérarchie](#rôles-et-hiérarchie)
3. [Matrice des permissions par endpoint](#matrice-des-permissions-par-endpoint)
4. [Matrice des permissions UI](#matrice-des-permissions-ui)
5. [Règles métier spéciales](#règles-métier-spéciales)

---

## 🎯 Vue d'ensemble

Le système MTS Telecom utilise 4 rôles principaux avec des permissions hiérarchiques:

- **CLIENT**: Utilisateur client (lecture tickets + création)
- **AGENT**: Agent support (gestion tickets, services)
- **MANAGER**: Manager (supervision, rapports, SLA)
- **ADMIN**: Administrateur système (gestion utilisateurs, config)

**Principe**: Un rôle supérieur hérite généralement des permissions du rôle inférieur.

---

## 👥 Rôles et hiérarchie

```
ADMIN (tout)
  └─ MANAGER (supervision + rapports)
      └─ AGENT (support + tickets)
          └─ CLIENT (tickets uniquement)
```

### CLIENT
- **Objectif**: Consulter et créer ses propres tickets
- **Accès**: Dashboard client, tickets, profil
- **Restrictions**: Ne peut pas voir les autres clients, pas d'accès admin

### AGENT
- **Objectif**: Gérer les tickets, incidents, services
- **Accès**: Tous tickets, clients, services, incidents
- **Restrictions**: Pas de gestion utilisateurs, pas de config SLA

### MANAGER  
- **Objectif**: Superviser les équipes, analyser les performances
- **Accès**: Tout AGENT + rapports + SLA + health monitoring
- **Restrictions**: Pas de gestion utilisateurs, pas de config système

### ADMIN
- **Objectif**: Configuration système et gestion utilisateurs
- **Accès**: Tout + utilisateurs + audit + config système
- **Restrictions**: Aucune

---

## 🔐 Matrice des permissions par endpoint

### **Authentication**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| POST /api/auth/register | ✅ Public | ✅ Public | ✅ Public | ✅ Public |
| POST /api/auth/login | ✅ Public | ✅ Public | ✅ Public | ✅ Public |
| GET /api/auth/me | ✅ | ✅ | ✅ | ✅ |
| PUT /api/auth/me | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/change-password | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/logout | ✅ | ✅ | ✅ | ✅ |

---

### **Tickets**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/tickets | ✅ (own) | ✅ (all) | ✅ (all) | ✅ (all) |
| POST /api/tickets | ✅ | ✅ | ✅ | ✅ |
| GET /api/tickets/{id} | ✅ (own) | ✅ | ✅ | ✅ |
| PUT /api/tickets/{id} | ❌ | ✅ | ✅ | ✅ |
| DELETE /api/tickets/{id} | ❌ | ❌ | ❌ | ✅ |
| POST /api/tickets/{id}/assign | ❌ | ✅ | ✅ | ✅ |
| POST /api/tickets/{id}/status | ❌ | ✅ | ✅ | ✅ |
| POST /api/tickets/{id}/priority | ❌ | ✅ | ✅ | ✅ |
| POST /api/tickets/{id}/comments | ✅ (own tickets) | ✅ | ✅ | ✅ |
| GET /api/tickets/{id}/comments | ✅ (own) | ✅ | ✅ | ✅ |

---

### **Clients**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/clients | ❌ | ✅ | ✅ | ✅ |
| POST /api/clients | ❌ | ✅ | ✅ | ✅ |
| GET /api/clients/{id} | ✅ (self) | ✅ | ✅ | ✅ |
| PUT /api/clients/{id} | ❌ | ✅ | ✅ | ✅ |
| DELETE /api/clients/{id} | ❌ | ❌ | ❌ | ✅ |

---

### **Services Télécom**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/services | ✅ (view) | ✅ | ✅ | ✅ |
| POST /api/services | ❌ | ❌ | ❌ | ✅ |
| GET /api/services/{id} | ✅ | ✅ | ✅ | ✅ |
| PUT /api/services/{id} | ❌ | ❌ | ✅ | ✅ |
| DELETE /api/services/{id} | ❌ | ❌ | ❌ | ✅ |
| POST /api/services/{id}/status | ❌ | ✅ | ✅ | ✅ |
| GET /api/services/{id}/history | ❌ | ✅ | ✅ | ✅ |

---

### **Incidents**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/incidents | ❌ | ✅ | ✅ | ✅ |
| POST /api/incidents | ❌ | ✅ | ✅ | ✅ |
| GET /api/incidents/{id} | ❌ | ✅ | ✅ | ✅ |
| PUT /api/incidents/{id} | ❌ | ✅ | ✅ | ✅ |
| DELETE /api/incidents/{id} | ❌ | ❌ | ❌ | ✅ |
| POST /api/incidents/{id}/resolve | ❌ | ✅ | ✅ | ✅ |

---

### **Rapports**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/reports | ❌ | ❌ | ✅ | ✅ |
| POST /api/reports | ❌ | ❌ | ✅ | ✅ |
| GET /api/reports/{id} | ❌ | ❌ | ✅ | ✅ |
| GET /api/reports/{id}/pdf | ❌ | ❌ | ✅ | ✅ |
| GET /api/reports/{id}/csv | ❌ | ❌ | ✅ | ✅ |
| DELETE /api/reports/{id} | ❌ | ❌ | ❌ | ✅ |

---

### **SLA & Escalade**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/sla/policies | ❌ | ❌ | ✅ | ✅ |
| POST /api/sla/policies | ❌ | ❌ | ✅ | ✅ |
| PUT /api/sla/policies/{id} | ❌ | ❌ | ✅ | ✅ |
| DELETE /api/sla/policies/{id} | ❌ | ❌ | ❌ | ✅ |
| GET /api/sla/escalations | ❌ | ✅ (view) | ✅ | ✅ |
| POST /api/sla/escalations/{id}/resolve | ❌ | ✅ | ✅ | ✅ |
| GET /api/sla/business-hours | ❌ | ❌ | ✅ | ✅ |
| PUT /api/sla/business-hours | ❌ | ❌ | ❌ | ✅ |

---

### **Utilisateurs**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/users | ❌ | ❌ | ❌ | ✅ |
| POST /api/users | ❌ | ❌ | ❌ | ✅ |
| GET /api/users/{id} | ✅ (self) | ❌ | ❌ | ✅ |
| PUT /api/users/{id} | ✅ (self) | ❌ | ❌ | ✅ |
| PATCH /api/users/{id}/role | ❌ | ❌ | ❌ | ✅ |
| PATCH /api/users/{id}/activate | ❌ | ❌ | ❌ | ✅ |
| PATCH /api/users/{id}/deactivate | ❌ | ❌ | ❌ | ✅ |
| GET /api/users/role/{role} | ❌ | ✅ (for assignment) | ✅ | ✅ |

---

### **Audit Logs**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/audit-logs | ❌ | ❌ | ❌ | ✅ |
| GET /api/audit-logs/entity/{type}/{id} | ❌ | ✅ (tickets only) | ✅ | ✅ |

---

### **Notifications**
| Endpoint | CLIENT | AGENT | MANAGER | ADMIN |
|----------|--------|-------|---------|-------|
| GET /api/notifications | ✅ | ✅ | ✅ | ✅ |
| GET /api/notifications/unread | ✅ | ✅ | ✅ | ✅ |
| PUT /api/notifications/{id}/read | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) |
| PUT /api/notifications/read-all | ✅ | ✅ | ✅ | ✅ |

---

## 🖥️ Matrice des permissions UI

### **Navigation**
| Route | CLIENT | AGENT | MANAGER | ADMIN |
|-------|--------|-------|---------|-------|
| /dashboard | ✅ | ✅ | ✅ | ✅ |
| /tickets | ✅ | ✅ | ✅ | ✅ |
| /tickets/kanban | ❌ | ✅ | ✅ | ✅ |
| /incidents | ❌ | ✅ | ✅ | ✅ |
| /sla | ❌ | ❌ | ✅ | ✅ |
| /health | ❌ | ✅ | ✅ | ✅ |
| /services | ❌ | ✅ | ✅ | ✅ |
| /reports | ❌ | ❌ | ✅ | ✅ |
| /clients | ❌ | ✅ | ✅ | ✅ |
| /users | ❌ | ❌ | ❌ | ✅ |
| /audit | ❌ | ❌ | ❌ | ✅ |
| /settings | ✅ | ✅ | ✅ | ✅ |
| /profile | ✅ | ✅ | ✅ | ✅ |
| /notifications | ✅ | ✅ | ✅ | ✅ |

---

### **Actions UI (Boutons/Menus)**

#### Tickets
| Action | CLIENT | AGENT | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Créer ticket | ✅ | ✅ | ✅ | ✅ |
| Modifier ticket | ❌ | ✅ | ✅ | ✅ |
| Supprimer ticket | ❌ | ❌ | ❌ | ✅ |
| Assigner agent | ❌ | ✅ | ✅ | ✅ |
| Changer statut | ❌ | ✅ | ✅ | ✅ |
| Changer priorité | ❌ | ✅ | ✅ | ✅ |
| Ajouter commentaire | ✅ (own) | ✅ | ✅ | ✅ |
| Voir historique | ❌ | ✅ | ✅ | ✅ |

#### Clients
| Action | CLIENT | AGENT | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Créer client | ❌ | ✅ | ✅ | ✅ |
| Modifier client | ❌ | ✅ | ✅ | ✅ |
| Supprimer client | ❌ | ❌ | ❌ | ✅ |

#### Services
| Action | CLIENT | AGENT | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Créer service | ❌ | ❌ | ❌ | ✅ |
| Modifier service | ❌ | ❌ | ✅ | ✅ |
| Supprimer service | ❌ | ❌ | ❌ | ✅ |
| Changer statut | ❌ | ✅ | ✅ | ✅ |

#### Incidents
| Action | CLIENT | AGENT | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Créer incident | ❌ | ✅ | ✅ | ✅ |
| Modifier incident | ❌ | ✅ | ✅ | ✅ |
| Supprimer incident | ❌ | ❌ | ❌ | ✅ |
| Résoudre incident | ❌ | ✅ | ✅ | ✅ |

#### Rapports
| Action | CLIENT | AGENT | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Générer rapport | ❌ | ❌ | ✅ | ✅ |
| Télécharger PDF | ❌ | ❌ | ✅ | ✅ |
| Télécharger CSV | ❌ | ❌ | ✅ | ✅ |
| Supprimer rapport | ❌ | ❌ | ❌ | ✅ |

#### Utilisateurs
| Action | CLIENT | AGENT | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Créer utilisateur | ❌ | ❌ | ❌ | ✅ |
| Modifier rôle | ❌ | ❌ | ❌ | ✅ |
| Activer/Désactiver | ❌ | ❌ | ❌ | ✅ |
| Reset mot de passe | ❌ | ❌ | ❌ | ✅ |

---

## ⚙️ Règles métier spéciales

### 1. **Isolation CLIENT**
- Un CLIENT ne peut voir que ses propres tickets (filtre automatique backend)
- Un CLIENT ne peut créer des tickets que pour son propre client associé
- Un CLIENT ne peut commenter que sur ses propres tickets

### 2. **Assignation AGENT**
- Seuls les AGENT/MANAGER/ADMIN peuvent réassigner des tickets
- Un ticket ne peut être assigné qu'à un utilisateur avec le rôle AGENT (ou supérieur)
- L'assignation déclenche une notification automatique

### 3. **Escalade SLA**
- Les escalades SLA sont automatiques selon les règles configurées
- Seuls MANAGER/ADMIN peuvent créer/modifier des politiques SLA
- Seuls ADMIN peuvent supprimer des politiques SLA

### 4. **Audit Log**
- Toutes les actions sensibles sont loggées automatiquement
- Seuls ADMIN peuvent consulter l'audit complet
- AGENT/MANAGER peuvent voir l'historique des tickets qu'ils gèrent

### 5. **Rapports**
- Seuls MANAGER/ADMIN peuvent générer des rapports
- Les rapports sont stockés et consultables dans l'historique
- Les rapports peuvent être filtrés par service, client, période

### 6. **Health Monitoring**
- AGENT/MANAGER/ADMIN peuvent consulter l'état des services
- Seuls ADMIN peuvent modifier les seuils de monitoring
- Les alertes sont envoyées automatiquement selon les rôles

---

## 🔧 Implémentation technique

### Backend (Spring Security)
```java
// Annotation @PreAuthorize sur les controllers
@PreAuthorize("hasRole('ADMIN')")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")

// Prefix automatique "ROLE_" géré par Spring
// hasRole('ADMIN') = hasAuthority('ROLE_ADMIN')
```

### Frontend (React)
```typescript
// Hook usePermissions()
const { hasRole, canCreate, canUpdate, canDelete } = usePermissions();

// RoleBasedRoute component
<RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
  <ReportsPage />
</RoleBasedRoute>

// Conditional rendering
{canUpdate && <Button>Modifier</Button>}
```

---

## 📝 Notes de maintenance

- **Mise à jour**: Cette matrice doit être mise à jour à chaque ajout de fonctionnalité
- **Tests**: Chaque permission doit avoir au moins 1 test unitaire backend
- **Documentation**: Documenter toute exception à la règle hiérarchique
- **Audit**: Vérifier régulièrement que les permissions backend/frontend sont synchronisées

---

**Dernière mise à jour**: 28/02/2026  
**Révision suivante**: Mensuelle ou à chaque sprint
