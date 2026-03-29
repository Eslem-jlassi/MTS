# Documentation MTS Telecom

## Point d'entree

Cette documentation est organisee autour de quatre usages :

- comprendre l'architecture et le produit
- lancer et deployer la plateforme
- preparer la soutenance
- conserver une trace propre des anciens supports

## Documentation active

### Produit et architecture

- [Architecture](ARCHITECTURE.md)
- [Guidelines layout frontend](frontend-layout-guidelines.md)
- [Base de donnees](DATABASE.md)
- [Matrice RBAC](RBAC_MATRIX.md)
- [Contrats API](API_CONTRACTS.md)

### Exploitation et lancement

- [README racine](../README.md)
- [Guide de lancement/deploiement](DEPLOYMENT.md)
- [Audit lot 8 - readiness deploiement](final-audit/progress/lot-8-deploy-readiness.md)

### Soutenance

- [Guide de demonstration jury](DEMO_JURY.md)
- [Checklist soutenance finale](DEMO_JURY_FINAL_CHECKLIST.md)

## Historique et archive

- `final-audit/` : historique d'audit, constats et rapports de lots
- `rapport-pfe/` : supports de rapport et diagrammes PFE
- `archive/legacy/` : documents retires du flux principal car obsoletes ou remplaces

## Regles de lecture

- La source de verite fonctionnelle est le code du depot.
- La source de verite securite et RBAC est le backend Spring Boot.
- La source de verite de deploiement est `docker-compose.yml` et les scripts `scripts/`.
