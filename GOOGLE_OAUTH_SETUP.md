# Configuration Google OAuth pour MTS Telecom

## 🔴 IMPORTANT : Client ID vs Client Secret

Vous avez actuellement un **Client Secret** (`GOCSPX-...`), mais il vous faut le **Client ID**.

### Différence :
- ✅ **Client ID** : Format `123456789-xxxxx.apps.googleusercontent.com` - Utilisé dans le frontend (React)
- ❌ **Client Secret** : Format `GOCSPX-xxxxx` - Utilisé uniquement dans le backend (Java)

---

## 📋 Étapes pour récupérer votre Client ID

### 1. Accéder à Google Cloud Console
Allez sur : https://console.cloud.google.com/apis/credentials

### 2. Localiser vos identifiants OAuth 2.0
- Dans la section **"ID clients OAuth 2.0"**
- Vous devriez voir votre application (celle où vous avez obtenu le Client Secret)
- Cliquez sur le nom de l'application

### 3. Copier le Client ID
Sur la page de détails, vous verrez :
```
ID client
123456789-abcdefghijk.apps.googleusercontent.com  [Copier]

Secret du client
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  [Copier]
```

**C'est la première ligne (ID client) qu'il faut copier !**

---

## ⚙️ Configuration des Origines Autorisées

### Dans Google Cloud Console :

#### Origines JavaScript autorisées :
Ajoutez ces URLs :
```
http://localhost:3000
http://127.0.0.1:3000
http://localhost:8080
```

#### URI de redirection autorisés :
Ajoutez ces URLs :
```
http://localhost:3000
http://localhost:3000/login
http://localhost:8080/api/auth/google
http://localhost:8080/api/oauth/google
```

### Cliquez sur **"ENREGISTRER"** en bas de page

---

## 📝 Configuration de votre application

### Frontend (React) - Fichier `.env`
```env
# Backend API URL
REACT_APP_BACKEND_ORIGIN=http://localhost:8080/api

# Google OAuth Client ID (PAS le Secret !)
REACT_APP_GOOGLE_OAUTH_CLIENT_ID=VOTRE_CLIENT_ID.apps.googleusercontent.com
```

### Backend (Java) - Fichier `application.yaml` ou variables d'environnement
```yaml
google:
  oauth:
    client-id: VOTRE_CLIENT_ID.apps.googleusercontent.com
    client-secret: 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
```

⚠️ **Ne jamais commiter le Client Secret dans Git !**

---

## 🧪 Test de la configuration

1. **Arrêtez** l'application React si elle tourne
2. Mettez à jour le fichier `.env` avec le bon Client ID
3. **Redémarrez** l'application :
   ```bash
   cd client
   npm start
   ```
4. Allez sur http://localhost:3000/login
5. Testez le bouton "Se connecter avec Google"

---

## ❓ Problèmes courants

### Erreur 401: invalid_client
- ❌ Vous utilisez le Client Secret au lieu du Client ID
- ✅ Solution : Utilisez le Client ID (format `.apps.googleusercontent.com`)

### Erreur 403: origin not allowed
- ❌ L'origine n'est pas autorisée dans Google Cloud Console
- ✅ Solution : Ajoutez `http://localhost:3000` dans "Origines JavaScript autorisées"

### Le bouton Google ne s'affiche pas
- ❌ Le Client ID est vide ou invalide dans `.env`
- ✅ Solution : Vérifiez que `REACT_APP_GOOGLE_OAUTH_CLIENT_ID` est correctement défini

---

## 🔄 Prochaines étapes

1. ✅ Récupérez le vrai **Client ID** (format `.apps.googleusercontent.com`)
2. ✅ Mettez-le dans `client/.env`
3. ✅ Décommentez le code Google Login dans `LoginPage.tsx` (lignes 267-287)
4. ✅ Redémarrez l'application React
5. ✅ Testez la connexion Google

---

**Besoin d'aide ?** Partagez une capture d'écran de la page Google Cloud Console si vous ne trouvez pas le Client ID.
