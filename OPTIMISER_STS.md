# Optimisation de Spring Tools Suite pour éviter les builds bloqués

## Problème résolu
✅ Votre projet compile parfaitement avec Maven (100 fichiers compilés sans erreur)
❌ Le problème vient de la configuration de Spring Tools Suite

## Configuration recommandée dans STS

### 1. Augmenter la mémoire allouée à STS

Éditez le fichier `SpringToolSuite4.ini` et modifiez:

```ini
-Xms512m
-Xmx2048m
```

Par:

```ini
-Xms1024m
-Xmx4096m
```

### 2. Désactiver la validation automatique pour certains fichiers

Dans STS:
1. **Window** → **Preferences**
2. **Validation**
3. Décochez les validateurs non essentiels:
   - HTML Syntax Validator
   - JavaScript Validator (si vous n'avez pas de JS dans le backend)
   - XML Validator (sauf si nécessaire)

### 3. Configurer Maven dans STS

1. **Window** → **Preferences**
2. **Maven**
3. Cochez:
   - ✅ "Do not automatically update dependencies from remote repositories"
   - ✅ "Download repository index updates on startup" → Décochez ceci
4. **Maven** → **User Settings**
   - Vérifiez que le chemin vers `settings.xml` est correct

### 4. Configurer le build automatique

1. **Window** → **Preferences**
2. **General** → **Workspace**
3. **Build**:
   - Décochez "Build automatically" si vous avez un gros projet
   - Ou augmentez "Save automatically before manual build"

### 5. Exclure certains dossiers du build

Clic droit sur le projet → **Properties** → **Java Build Path** → **Source**

Ajoutez à "Excluded":
- `**/target/**`
- `**/node_modules/**` (si présent)
- `**/.git/**`

## Si le build se bloque à nouveau

### Solution rapide en ligne de commande:

```powershell
cd server
mvn clean compile -DskipTests
```

Puis dans STS:
- Clic droit sur le projet → **Maven** → **Update Project**
- **Project** → **Clean**

## Vérification que Lombok fonctionne

Après avoir installé Lombok dans STS (avec lombok.jar), vérifiez:

1. Ouvrez un fichier avec `@Slf4j` (ex: AuthService)
2. L'erreur "log cannot be resolved" devrait avoir disparu
3. Dans l'outline, vous devriez voir les méthodes générées par Lombok

Si ce n'est pas le cas:
1. Vérifiez que lombok.jar a bien été installé
2. Redémarrez STS
3. Maven → Update Project (Force Update)

## Résumé des commandes utiles

### Nettoyer et recompiler:
```powershell
cd server
mvn clean compile -DskipTests
```

### Installer les dépendances:
```powershell
mvn install -DskipTests
```

### Vérifier les dépendances:
```powershell
mvn dependency:tree
```

### Lancer l'application (sans STS):
```powershell
mvn spring-boot:run
```

## Prochaines étapes

1. ✅ Le build Maven fonctionne
2. ⏳ Installer Lombok dans STS (si pas encore fait)
3. ⏳ Configurer STS selon les recommandations ci-dessus
4. ✅ Votre projet devrait compiler sans erreurs dans STS
