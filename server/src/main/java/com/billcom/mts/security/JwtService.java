package com.billcom.mts.security;

// =============================================================================
// IMPORTS - Bibliothèques nécessaires pour JWT
// =============================================================================

import java.util.Date;                          // Pour gérer les dates d'expiration
import java.util.HashMap;                       // Pour stocker les claims personnalisés
import java.util.Map;                           // Interface Map
import java.util.function.Function;             // Pour les fonctions lambda (extractClaim)

import com.billcom.mts.entity.User;             // Notre entité User
import io.jsonwebtoken.Claims;                  // Les "claims" = données contenues dans le JWT
import io.jsonwebtoken.ExpiredJwtException;     // Exception quand le token est expiré
import io.jsonwebtoken.Jwts;                    // Classe principale de la librairie JJWT
import io.jsonwebtoken.security.Keys;          // Utilitaire pour créer des clés de signature
import lombok.extern.slf4j.Slf4j;               // Logger automatique
import org.springframework.beans.factory.annotation.Value;  // Injection de valeurs depuis application.yaml
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;                  // Clé secrète pour signer le JWT

// =============================================================================
// SERVICE JWT - Génération et validation des tokens
// =============================================================================
/**
 * ============================================================================
 * JwtService - Service de gestion des tokens JWT
 * ============================================================================
 * 
 * QU'EST-CE QU'UN JWT (JSON Web Token)?
 * ------------------------------------
 * Un JWT est une chaîne de caractères encodée en Base64 composée de 3 parties:
 * 
 * HEADER.PAYLOAD.SIGNATURE
 * 
 * Exemple réel:
 * eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJBRE1JTiIsInN1YiI6ImFkbWluQG10cy5jb20ifQ.xyz
 * 
 * 1. HEADER (En-tête):
 *    {"alg": "HS256", "typ": "JWT"}
 *    → Indique l'algorithme de signature utilisé
 * 
 * 2. PAYLOAD (Charge utile / Claims):
 *    {"userId": 1, "role": "ADMIN", "sub": "admin@mts.com", "exp": 1234567890}
 *    → Contient les données de l'utilisateur
 *    → "sub" (subject) = identifiant principal (email)
 *    → "exp" = date d'expiration
 * 
 * 3. SIGNATURE:
 *    HMACSHA256(header + "." + payload, secret)
 *    → Garantit que le token n'a pas été modifié
 * 
 * POURQUOI UTILISER JWT?
 * ----------------------
 * - Stateless: Le serveur n'a pas besoin de stocker les sessions
 * - Scalable: Fonctionne avec plusieurs serveurs (load balancing)
 * - Sécurisé: Signé cryptographiquement
 * - Portable: Peut être utilisé entre différents services
 * 
 * FLUX D'UTILISATION:
 * 1. Login → Le serveur génère un JWT et le renvoie
 * 2. Client stocke le JWT (localStorage, cookie, etc.)
 * 3. Chaque requête → Client envoie le JWT dans le header Authorization
 * 4. Serveur valide le JWT et extrait les infos utilisateur
 * 
 * ============================================================================
 */
@Slf4j
@Service
public class JwtService {

    // =========================================================================
    // CONSTANTES - Clés utilisées dans le payload du JWT
    // =========================================================================
    
    /** Clé pour stocker le rôle de l'utilisateur dans le JWT */
    private static final String ROLE_KEY = "role";
    
    /** Clé pour stocker l'ID de l'utilisateur dans le JWT */
    private static final String USER_ID_KEY = "userId";

    // =========================================================================
    // CONFIGURATION - Valeurs injectées depuis application.yaml
    // =========================================================================
    
    /**
     * Clé secrète pour signer les tokens JWT.
     * 
     * @Value: Annotation Spring qui injecte une valeur depuis le fichier de config
     * ${jwt.secret} → Récupère la valeur de "jwt.secret" dans application.yaml
     * 
     * SÉCURITÉ IMPORTANTE:
     * - Cette clé doit être LONGUE (au moins 256 bits = 32 caractères)
     * - Elle doit être SECRÈTE (ne jamais la commiter dans Git!)
     * - En production, utiliser une variable d'environnement
     */
    @Value("${jwt.secret}")
    private String jwtSecret;

    /**
     * Durée de vie du token d'accès en millisecondes.
     * Typiquement: 15 minutes à 1 heure
     * Plus c'est court, plus c'est sécurisé (mais moins pratique)
     */
    @Value("${jwt.access-token.expiration-ms}")
    private long accessTokenExpiration;

    /**
     * Durée de vie du token de rafraîchissement en millisecondes.
     * Typiquement: 7 à 30 jours
     * Utilisé pour obtenir un nouveau access token sans re-login
     */
    @Value("${jwt.refresh-token.expiration-ms}")
    private long refreshTokenExpiration;

    // =========================================================================
    // MÉTHODES DE GÉNÉRATION DE TOKENS
    // =========================================================================
    
    /**
     * Génère un ACCESS TOKEN pour l'utilisateur.
     * 
     * L'access token est utilisé pour authentifier les requêtes API.
     * Il a une courte durée de vie pour limiter les risques en cas de vol.
     * 
     * @param userDetails L'utilisateur pour lequel générer le token
     * @return Le token JWT sous forme de chaîne
     */
    public String generateAccessToken(UserDetails userDetails) {
        return generateToken(userDetails, accessTokenExpiration);
    }

    /**
     * Génère un REFRESH TOKEN pour l'utilisateur.
     * 
     * Le refresh token permet d'obtenir un nouvel access token
     * sans demander à l'utilisateur de se reconnecter.
     * Il a une longue durée de vie mais est stocké de manière plus sécurisée.
     * 
     * @param userDetails L'utilisateur pour lequel générer le token
     * @return Le token JWT sous forme de chaîne
     */
    public String generateRefreshToken(UserDetails userDetails) {
        return generateToken(userDetails, refreshTokenExpiration);
    }

    /**
     * Méthode générique pour créer un token JWT.
     * 
     * STRUCTURE DU TOKEN GÉNÉRÉ:
     * {
     *   "userId": 123,           // ID de l'utilisateur (claim personnalisé)
     *   "role": "ADMIN",         // Rôle de l'utilisateur (claim personnalisé)
     *   "sub": "user@email.com", // Subject = email (claim standard)
     *   "iat": 1234567890,       // Issued At = date de création (claim standard)
     *   "exp": 1234571490        // Expiration = date d'expiration (claim standard)
     * }
     * 
     * @param userDetails L'utilisateur
     * @param expirationMs Durée de validité en millisecondes
     * @return Token JWT signé
     */
    public String generateToken(UserDetails userDetails, long expirationMs) {
        // Récupère le timestamp actuel en millisecondes
        long now = System.currentTimeMillis();
        
        // Calcule la date d'expiration: maintenant + durée de validité
        Date willExpireAt = new Date(now + expirationMs);

        // Crée une Map pour les claims personnalisés (données supplémentaires)
        Map<String, Object> extraClaims = new HashMap<>();
        
        // Pattern matching Java 17: vérifie si userDetails est de type User
        // et le caste automatiquement dans la variable "user"
        if (userDetails instanceof User user) {
            // Ajoute l'ID utilisateur dans le token
            extraClaims.put(USER_ID_KEY, user.getId());
            // Ajoute le rôle dans le token (ex: "ADMIN", "CLIENT")
            extraClaims.put(ROLE_KEY, user.getRole().name());
        }
        
        // Construction du token avec le Builder Pattern
        return Jwts.builder()
                .claims(extraClaims)                    // Ajoute nos claims personnalisés
                .subject(userDetails.getUsername())     // Subject = email de l'utilisateur
                .issuedAt(new Date(now))                // Date de création
                .expiration(willExpireAt)               // Date d'expiration
                .signWith(getSigningKey(), Jwts.SIG.HS256)  // Signe avec HMAC-SHA256
                .compact();                             // Construit le token final (String)
    }

    // =========================================================================
    // MÉTHODES D'EXTRACTION - Lire les données du token
    // =========================================================================
    
    /**
     * Extrait le nom d'utilisateur (email) du token.
     * 
     * Claims::getSubject est une référence de méthode Java 8.
     * C'est équivalent à: claims -> claims.getSubject()
     * 
     * @param token Le token JWT à décoder
     * @return L'email de l'utilisateur
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extrait l'ID de l'utilisateur du token.
     * 
     * @param token Le token JWT à décoder
     * @return L'ID de l'utilisateur (Long)
     */
    public Long extractUserId(String token) {
        // Lambda expression: prend les claims et retourne la valeur de "userId"
        return extractClaim(token, claims -> claims.get(USER_ID_KEY, Long.class));
    }

    /**
     * Extrait le rôle de l'utilisateur du token.
     * 
     * @param token Le token JWT à décoder
     * @return Le rôle sous forme de String ("ADMIN", "CLIENT", etc.)
     */
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get(ROLE_KEY, String.class));
    }

    // =========================================================================
    // MÉTHODES DE VALIDATION - Vérifier si le token est valide
    // =========================================================================
    
    /**
     * Vérifie si un token est valide pour un utilisateur donné.
     * 
     * Un token est valide si:
     * 1. Le nom d'utilisateur dans le token correspond à l'utilisateur
     * 2. Le token n'est pas expiré
     * 
     * @param token Le token JWT à valider
     * @param userDetails L'utilisateur attendu
     * @return true si le token est valide, false sinon
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        // Extrait l'email du token
        final String userName = extractUsername(token);
        
        // Vérifie que l'email correspond ET que le token n'est pas expiré
        return (userName.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    /**
     * Vérifie si un token est expiré.
     * 
     * Compare la date d'expiration du token avec la date actuelle.
     * 
     * @param token Le token JWT à vérifier
     * @return true si le token est expiré, false sinon
     */
    public boolean isTokenExpired(String token) {
        try {
            // extractExpiration() récupère la date d'expiration du token
            // .before() vérifie si cette date est antérieure à maintenant
            return extractExpiration(token).before(new Date(System.currentTimeMillis()));
        } catch (ExpiredJwtException e) {
            // Si JJWT lance une exception d'expiration, le token est expiré
            return true;
        }
    }

    /**
     * Retourne la durée de validité de l'access token.
     * Utilisé par AuthService pour informer le client.
     * 
     * @return Durée en millisecondes
     */
    public long getAccessTokenExpiration() {
        return accessTokenExpiration;
    }

    // =========================================================================
    // MÉTHODES PRIVÉES - Logique interne de décodage
    // =========================================================================
    
    /**
     * Extrait la date d'expiration du token.
     * 
     * @param token Le token JWT
     * @return Date d'expiration
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Méthode générique pour extraire n'importe quel claim du token.
     * 
     * CONCEPT: GENERICS + FUNCTIONAL INTERFACE
     * - <T> : Type générique, peut être String, Long, Date, etc.
     * - Function<Claims, T> : Fonction qui prend des Claims et retourne T
     * 
     * EXEMPLE D'UTILISATION:
     * extractClaim(token, Claims::getSubject)  → retourne String (email)
     * extractClaim(token, Claims::getExpiration) → retourne Date
     * extractClaim(token, c -> c.get("userId", Long.class)) → retourne Long
     * 
     * @param token Le token JWT à décoder
     * @param claimsResolvers Fonction pour extraire la valeur souhaitée
     * @return La valeur extraite du type T
     */
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolvers) {
        // D'abord, on extrait tous les claims du token
        final Claims claims = extractAllClaims(token);
        // Ensuite, on applique la fonction pour obtenir la valeur voulue
        return claimsResolvers.apply(claims);
    }

    /**
     * Décode le token JWT et extrait tous les claims (payload).
     * 
     * PROCESSUS DE DÉCODAGE:
     * 1. Jwts.parser() → Crée un parser JWT
     * 2. verifyWith(key) → Configure la clé de vérification de signature
     * 3. build() → Construit le parser
     * 4. parseSignedClaims(token) → Décode et vérifie la signature
     * 5. getPayload() → Retourne le payload (les claims)
     * 
     * Si la signature ne correspond pas, une exception est lancée!
     * Cela garantit que le token n'a pas été modifié.
     * 
     * @param token Le token JWT à décoder
     * @return Claims (Map-like object contenant toutes les données)
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()                    // Crée le parser
                .verifyWith(getSigningKey())    // Définit la clé pour vérifier la signature
                .build()                        // Construit le parser
                .parseSignedClaims(token)       // Parse et vérifie le token
                .getPayload();                  // Retourne le contenu (claims)
    }

    /**
     * Crée la clé secrète pour signer/vérifier les tokens.
     * 
     * HMAC-SHA256 nécessite une clé d'au moins 256 bits (32 octets).
     * On convertit notre chaîne secrète en bytes, puis en SecretKey.
     * 
     * IMPORTANT: La même clé doit être utilisée pour signer ET vérifier!
     * Si vous changez la clé, tous les tokens existants deviennent invalides.
     * 
     * @return SecretKey pour HMAC-SHA256
     */
    private SecretKey getSigningKey() {
        // Convertit la chaîne secrète en tableau de bytes (UTF-8)
        byte[] keyBytes = jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        // Crée une clé HMAC à partir des bytes
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
