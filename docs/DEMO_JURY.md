# Guide de démonstration — Soutenance PFE

> Ce document décrit les scénarios à dérouler devant le jury, rôle par rôle, pour montrer les fonctionnalités clés de MTS.

---

## 1. Préparation de l'environnement

### Lancement rapide

```bash
# Terminal 1 — Base de données
docker-compose up -d

# Terminal 2 — Backend
cd server
mvn spring-boot:run

# Terminal 3 — Frontend
cd client
npm start
```

Ouvrir http://localhost:3000 dans le navigateur.

### Alternative sans backend (mode démo)

Si le backend ne peut pas être lancé le jour de la soutenance :

```
http://localhost:3000?demo=true
```

Ce mode active un intercepteur Axios qui simule toutes les réponses API avec des données réalistes, sans aucune connexion backend. Toutes les fonctionnalités UI sont démontrables.

### Données nécessaires

Les migrations Flyway (V1–V2) insèrent automatiquement :
- **6 utilisateurs** (1 admin, 1 manager, 2 agents, 2 clients)
- **3 entreprises clientes** (Ericsson, Ooredoo, Tunisie Telecom)
- **8 services télécom** (BSCS, HLR, OSS, MSC…)
- **~15 tickets** avec commentaires et historique
- **Politiques SLA** par priorité

> Aucune donnée supplémentaire à insérer manuellement.

---

## 2. Scénario 1 — Rôle CLIENT

**Objectif :** montrer le parcours complet d'un utilisateur client qui soumet et suit un ticket.

### Étapes

| # | Action | Ce qu'on montre |
|---|--------|-----------------|
| 1 | Se connecter en tant que client | Page de connexion avec design professionnel, validation en temps réel |
| 2 | Observer le dashboard client | KPI personnalisés : mes tickets, statuts, SLA |
| 3 | Créer un nouveau ticket | Formulaire avec sélection de service, catégorie (PANNE/DEMANDE/RÉCLAMATION), priorité |
| 4 | Observer le ticket créé | Numéro auto-généré (TK-xxx), deadline SLA calculée automatiquement |
| 5 | Ajouter un commentaire | Commentaire visible par l'agent assigné |
| 6 | Joindre un fichier | Upload de pièce jointe (capture d'écran, log…) |
| 7 | Recevoir une notification | Notification temps réel quand l'agent change le statut |
| 8 | Voir l'historique | Timeline complète : création → assignation → en cours → résolu |

### Points à souligner
- Le client ne voit que **ses propres tickets**
- Les **commentaires internes** des agents ne sont **pas visibles** pour le client
- Le SLA est automatiquement calculé à la création

---

## 3. Scénario 2 — Rôle AGENT

**Objectif :** montrer le traitement quotidien des tickets par un agent.

### Étapes

| # | Action | Ce qu'on montre |
|---|--------|-----------------|
| 1 | Se connecter en tant qu'agent | Dashboard agent avec tickets assignés et KPI |
| 2 | Voir les tickets assignés | Liste filtrée automatiquement |
| 3 | Vue Kanban | Basculer en vue Kanban — colonnes par statut |
| 4 | Ouvrir un ticket | Page détail : infos, commentaires, historique, SLA restant |
| 5 | Changer le statut → IN_PROGRESS | Transition de workflow, entrée dans l'historique |
| 6 | Ajouter une note interne | Commentaire `isInternal: true` — visible uniquement par l'équipe |
| 7 | Utiliser une macro / réponse rapide | Application d'un template de réponse |
| 8 | Résoudre le ticket → RESOLVED | Saisie de la résolution, cause racine |
| 9 | Observer le SLA | Badge SLA (vert/orange/rouge), pourcentage restant |

### Points à souligner
- L'agent ne peut **pas assigner** de tickets (réservé au MANAGER/ADMIN)
- Le workflow impose des **transitions valides** (OPEN → IN_PROGRESS, pas OPEN → CLOSED)
- Le SLA est **pausé** en dehors des heures ouvrées

---

## 4. Scénario 3 — Rôle MANAGER

**Objectif :** montrer la supervision d'équipe et la gestion des incidents.

### Étapes

| # | Action | Ce qu'on montre |
|---|--------|-----------------|
| 1 | Se connecter en tant que manager | Dashboard manager avec vue d'ensemble |
| 2 | Voir le dashboard avec KPI | Total tickets, SLA compliance, tickets critiques, tendances 7/30 jours |
| 3 | Assigner un ticket à un agent | Sélection d'un agent disponible depuis le détail du ticket |
| 4 | Actions en masse | Sélectionner plusieurs tickets → assignation/changement statut en bulk |
| 5 | Exporter en CSV/Excel/PDF | Export des tickets filtrés |
| 6 | Créer un incident | Formulaire incident lié à un service + tickets associés |
| 7 | Suivre la timeline incident | Chronologie des événements (détecté → investigation → résolu) |
| 8 | Rédiger un post-mortem | Analyse de cause racine après résolution |
| 9 | Générer un rapport | Rapport mensuel avec résumé exécutif |
| 10 | Voir les SLA en dépassement | Page SLA → tickets breached + approaching |

### Points à souligner
- Dashboard avec **graphiques interactifs** (Recharts)
- Les **règles d'escalade** s'appliquent automatiquement
- Le manager voit les **statistiques par agent** (performance individuelle)

---

## 5. Scénario 4 — Rôle ADMIN

**Objectif :** montrer l'administration complète du système.

### Étapes

| # | Action | Ce qu'on montre |
|---|--------|-----------------|
| 1 | Se connecter en tant qu'admin | Dashboard admin complet |
| 2 | Gérer les utilisateurs | Liste, activation/désactivation, changement de rôle |
| 3 | Gérer les services télécom | CRUD services, changement de statut (UP/DOWN/DEGRADED) |
| 4 | Topologie réseau | Arbre de dépendances inter-services |
| 5 | Configurer les politiques SLA | Créer/modifier des SLA par priorité et service |
| 6 | Configurer les heures ouvrées | Définir les jours/heures de travail pour le calcul SLA |
| 7 | Définir les règles d'escalade | Créer des règles automatiques (seuil → action) |
| 8 | Consulter le journal d'audit | Filtrer par entité, utilisateur, action, période |
| 9 | Gérer les clients | CRUD entreprises clientes |
| 10 | Gérer les macros et templates | Créer des modèles de réponse rapide |

### Points à souligner
- L'admin a accès à **toutes les fonctionnalités** de tous les rôles
- Le journal d'audit est **immuable** — aucune action ne peut être supprimée
- La topologie montre l'**impact en cascade** des pannes

---

## 6. Scénario transversal — Fonctionnalités techniques

| Fonctionnalité | Comment la montrer |
|----------------|-------------------|
| **Thème sombre/clair** | Toggle dans la barre supérieure — tout le design system s'adapte |
| **Responsive** | Redimensionner le navigateur ou ouvrir les DevTools en mode mobile |
| **Notifications temps réel** | Ouvrir 2 onglets (agent + client), changer un statut → notification instantanée |
| **Sécurité JWT** | Montrer le token dans les DevTools (Network) — expiration 15 min + refresh automatique |
| **Google OAuth** | Bouton "Se connecter avec Google" sur la page de login |
| **Swagger API** | Ouvrir http://localhost:8080/swagger-ui.html — documentation interactive |
| **Recherche et filtres** | Utiliser la recherche texte + filtres par statut/priorité/service |
| **Palette de commandes** | Raccourci clavier pour la command palette (recherche rapide) |
| **Accessibilité** | Navigation au clavier (Tab), indicateurs de focus visibles |
| **Mode démo** | Ajouter `?demo=true` — fonctionne sans backend |

---

## 7. Questions fréquentes du jury

| Question probable | Réponse suggérée |
|-------------------|------------------|
| *Pourquoi Spring Boot + React ?* | Stack standard enterprise, séparation claire front/back, écosystème mature, compétences recherchées sur le marché |
| *Comment gérez-vous la sécurité ?* | JWT stateless avec refresh token rotation (OWASP), `@PreAuthorize` sur chaque endpoint, BCrypt pour les mots de passe |
| *Comment fonctionne le SLA ?* | Politique configurable par priorité/service, calcul basé sur les heures ouvrées, pause automatique hors horaires, escalade avec règles configurables |
| *Comment assurez-vous la qualité ?* | 47 tests automatisés (JUnit + RTL), ESLint/Prettier, Spotless, GlobalExceptionHandler RFC 7807, RequestIdFilter pour la corrélation des logs |
| *Quelle est l'évolution prévue ?* | Microservice chatbot NLP (Python), monitoring temps réel avancé, multi-tenant complet, tableau de bord BI |

---

## 8. Checklist pré-soutenance

- [ ] Docker lancé (`docker-compose up -d`)
- [ ] Backend compilé et fonctionnel (`mvn spring-boot:run`)
- [ ] Frontend démarré (`npm start`)
- [ ] Swagger accessible (http://localhost:8080/swagger-ui.html)
- [ ] 4 sessions navigateur prêtes (1 par rôle) ou mode démo activé
- [ ] Présentation des diagrammes d'architecture (Mermaid → image ou slide)
- [ ] Ce document imprimé ou accessible sur un second écran
