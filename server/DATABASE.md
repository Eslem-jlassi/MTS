# MTS Telecom – Base de données

## Erreur « Communications link failure » / « Connection refused »

Cette erreur signifie que **MySQL n’est pas joignable** par Spring Boot (souvent : MySQL arrêté ou mauvais host/port).

---

## Option 1 : Utiliser MySQL (production / données persistantes)

1. **Démarrer MySQL** (port 3306).
2. **Créer la base** (une seule fois) :
   ```sql
   CREATE DATABASE IF NOT EXISTS mts_telecom_db
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. **Vérifier la config** dans `src/main/resources/application.yaml` :
   - `spring.datasource.url` : `jdbc:mysql://localhost:3306/mts_telecom_db?...`
   - `spring.datasource.username` : `root`
   - `spring.datasource.password` : `Root123!`
4. **Relancer l’application** :
   ```bash
   mvn spring-boot:run
   ```

Si MySQL est sur un autre host/port, adapter l’URL (ou utiliser des variables d’environnement).

---

## Option 2 : Utiliser H2 en mémoire (développement sans MySQL)

Si vous ne voulez pas installer/démarrer MySQL, vous pouvez lancer le serveur avec le profil **H2** (base en mémoire, recréée à chaque démarrage) :

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

- Base H2 en mémoire, pas d’installation MySQL.
- Flyway est désactivé pour ce profil ; le schéma est géré par JPA.
- Console H2 : http://localhost:8080/h2-console (JDBC URL : `jdbc:h2:mem:mts_telecom_db`, user : `sa`, password vide).

---

## Résumé

| Cause probable              | Action |
|----------------------------|--------|
| MySQL non démarré          | Démarrer le service MySQL. |
| Mauvais host/port          | Vérifier `application.yaml` ou variables d’env. |
| Base non créée             | Exécuter le `CREATE DATABASE` ci‑dessus. |
| Développement sans MySQL   | Lancer avec le profil `h2` (Option 2). |
