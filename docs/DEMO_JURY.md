# Demo Jury - MTS Telecom

Ce guide est aligne sur le code reel du depot et sur les scripts officiels.

## 1. Preparation

### Option recommandee

```bat
scripts\dev\start-local.bat
```

### Option demo rapide

```bat
scripts\demo\start-demo-h2.bat
```

### URLs a verifier

- `http://localhost:3000`
- `http://localhost:8080/swagger-ui.html`
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8001/health`
- `http://127.0.0.1:8002/health`

## 2. Comptes de demo

### Si vous lancez MySQL + Flyway

- mot de passe commun : `Password1!`
- `admin@mts-telecom.ma`
- `manager@mts-telecom.ma`
- `karim.agent@mts-telecom.ma`
- `layla.agent@mts-telecom.ma`
- `support@atlas-distribution.ma`
- `dsi@sahara-connect.ma`

### Si vous lancez le profil H2

- mot de passe commun : `Password1!`
- memes emails que ci-dessus

## 3. Parcours a montrer

### Parcours CLIENT

Montrer :

1. dashboard client
2. creation d'un ticket
3. detail ticket avec SLA, historique et commentaires
4. piece jointe
5. notification lors d'un changement cote support
6. chatbot pour aide ou brouillon ticket

Messages a faire passer :

- le client ne voit que ses tickets
- les notes internes restent masquees
- le SLA et l'historique sont traces automatiquement

### Parcours AGENT

Montrer :

1. file de tickets assignes
2. consultation du pool non assigne
3. ouverture du detail ticket / drawer
4. commentaire et note interne
5. transition de statut autorisee
6. resolution d'un ticket avec historique mis a jour

Messages a faire passer :

- l'agent ne peut pas assigner
- il ne traite que les tickets assignes
- l'historique et les pieces jointes restent coherents

### Parcours MANAGER

Montrer :

1. dashboard manager
2. assignation d'un ticket a un agent
3. supervision services / sante / topologie
4. vue incidents et SLA
5. exports ou rapports

Messages a faire passer :

- le manager supervise sans avoir tous les droits structurels de l'admin
- il voit les KPI et la priorisation globale
- les regles d'acces sont fermees cote backend

### Parcours ADMIN

Montrer :

1. gestion des utilisateurs
2. creation d'utilisateur interne
3. creation client back-office
4. audit
5. politique de suppression professionnelle
6. parametres sensibles et gestion transverse

Messages a faire passer :

- l'admin garde le plein controle
- les suppressions definitives sont explicites, auditees et bloquees si non sures
- la tracabilite prime sur la suppression brute

### Parcours IA

Montrer :

1. analyse sentiment / classification
2. detection de doublons
3. chatbot IA en francais
4. cas de faible confiance
5. brouillon ticket issu du chatbot

Messages a faire passer :

- les trois briques IA existent reellement dans le depot
- le backend orchestre les appels aux microservices
- le chatbot reste prudent quand la confiance est faible

## 4. Mode demo frontend

Le mode demo n'est plus active par query param.

### Activation

1. copier `client/.env.demo` vers `client/.env`
2. lancer `npm start`

### Ce qu'il faut dire au jury

- le mode demo est explicite
- il ne remplace pas silencieusement un backend casse
- les routes non mockees continuent a echouer visiblement

## 5. Narratif de soutenance recommande

- presenter le probleme metier : supervision telecom + support client
- montrer l'architecture modulaire complete
- enchainer un ticket client puis son traitement support
- ouvrir la supervision services / incidents / SLA
- finir par l'administration, l'audit et l'IA

## 6. Checklist avant passage

- verifier les 5 URLs ci-dessus
- preparer un compte par role
- verifier que le chatbot et les microservices repondent
- verifier que le backend affiche Swagger
- verifier que les menus visibles correspondent bien au role utilise
- verifier que le mode demo est desactive sauf si vous l'assumez explicitement
