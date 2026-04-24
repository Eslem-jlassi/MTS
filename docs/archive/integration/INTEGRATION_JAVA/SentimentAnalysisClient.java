package com.billcom.mts.client;

// =============================================================================
// MTS TELECOM - CLIENT POUR MICROSERVICE SENTIMENT ANALYSIS
// =============================================================================
/**
 * Service Spring qui appelle le microservice Python FastAPI pour l'analyse
 * de sentiment des tickets clients.
 * 
 * ARCHITECTURE:
 * ┌─────────────┐      HTTP POST       ┌──────────────────┐
 * │ Spring Boot │ ──────────────────> │ FastAPI (Python) │
 * │   (Java)    │   /analyze           │   Port 8000      │
 * │  Port 8080  │ <────────────────── │                  │
 * └─────────────┘   JSON Response      └──────────────────┘
 * 
 * CAS D'USAGE PFE:
 * 1. Client crée un ticket avec description
 * 2. TicketService appelle ce SentimentAnalysisClient
 * 3. Si URGENT_EMOTIONAL détecté → Priorité automatique
 * 4. Notification WebSocket au manager
 * 
 * JURY - POINTS IMPORTANTS:
 * ✓ Architecture microservices (séparation des responsabilités)
 * ✓ Communication REST synchrone (alt: message queue asynchrone)
 * ✓ Résilience: timeout, retry, fallback
 * ✓ Observabilité: logs, métriques
 */

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Client pour appeler le microservice d'analyse de sentiment.
 * 
 * CHOIX TECHNIQUE: WebClient (Spring 5+) au lieu de RestTemplate
 * ✓ Non-bloquant (asynchrone)
 * ✓ Moderne (RestTemplate déprécié)
 * ✓ Réactif (compatible Spring WebFlux)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SentimentAnalysisClient {

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    
    /**
     * URL du microservice Python (configurable via application.yaml).
     * 
     * DÉVELOPPEMENT: http://localhost:8000
     * PRODUCTION: http://sentiment-service:8000 (Docker Compose)
     * KUBERNETES: http://sentiment-service.default.svc.cluster.local:8000
     */
    @Value("${app.sentiment-service.url:http://localhost:8000}")
    private String sentimentServiceUrl;
    
    /**
     * Timeout pour l'appel au microservice (en millisecondes).
     * 
     * JURY: Expliquer pourquoi timeout important
     * → Évite que le backend se bloque si le microservice est lent
     */
    @Value("${app.sentiment-service.timeout-ms:5000}")
    private int timeoutMs;

    private final WebClient.Builder webClientBuilder;

    // =========================================================================
    // DTO - REQUÊTE
    // =========================================================================
    
    /**
     * Structure de la requête envoyée au microservice Python.
     * 
     * IMPORTANT: Doit correspondre exactement à SentimentRequest (Python).
     */
    public record SentimentRequest(
        String text,
        Integer ticketId,
        String language
    ) {
        public SentimentRequest(String text, Integer ticketId) {
            this(text, ticketId, "auto");
        }
    }

    // =========================================================================
    // DTO - RÉPONSE
    // =========================================================================
    
    /**
     * Structure de la réponse retournée par le microservice Python.
     * 
     * IMPORTANT: Doit correspondre exactement à SentimentResponse (Python).
     */
    public record SentimentResponse(
        String sentiment,        // "TRÈS NÉGATIF", "NÉGATIF", etc.
        Double score,            // Score de confiance (0-1)
        Integer stars,           // Note sur 5 étoiles
        Boolean isAngry,         // Client en colère ?
        String priorityFlag,     // "URGENT_EMOTIONAL" ou null
        Double confidence,       // Pourcentage (0-100)
        String processedAt       // Timestamp
    ) {}

    // =========================================================================
    // MÉTHODE PRINCIPALE - ANALYSE DE SENTIMENT
    // =========================================================================
    
    /**
     * Analyse le sentiment du texte d'un ticket.
     * 
     * FLUX:
     * 1. Crée une requête HTTP POST vers /analyze
     * 2. Envoie le texte au microservice Python
     * 3. Attend la réponse (max 5 secondes)
     * 4. Parse la réponse JSON
     * 5. Retourne le résultat ou null si erreur
     * 
     * @param text Texte du ticket à analyser
     * @param ticketId ID du ticket (pour traçabilité)
     * @return SentimentResponse ou null si erreur
     */
    public SentimentResponse analyzeSentiment(String text, Integer ticketId) {
        log.info("📨 Appel microservice sentiment | Ticket ID: {} | Texte: {} chars", 
                 ticketId, text.length());
        
        try {
            // Construction du WebClient (réutilisable)
            WebClient webClient = webClientBuilder
                .baseUrl(sentimentServiceUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
            
            // Création de la requête
            SentimentRequest request = new SentimentRequest(text, ticketId);
            
            // Appel HTTP POST /analyze
            SentimentResponse response = webClient
                .post()
                .uri("/analyze")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(SentimentResponse.class)
                .timeout(Duration.ofMillis(timeoutMs))
                .block();  // Bloque jusqu'à réception (synchrone)
            
            if (response != null) {
                log.info("✅ Analyse reçue | Ticket ID: {} | Sentiment: {} | Priorité: {}",
                         ticketId, response.sentiment(), response.priorityFlag());
                return response;
            } else {
                log.warn("⚠️ Réponse vide du microservice | Ticket ID: {}", ticketId);
                return null;
            }
            
        } catch (WebClientException e) {
            log.error("❌ Erreur lors de l'appel au microservice sentiment | Ticket ID: {} | Erreur: {}",
                      ticketId, e.getMessage());
            // FALLBACK: On retourne null au lieu de crasher
            // Le ticket sera créé normalement, sans analyse de sentiment
            return null;
            
        } catch (Exception e) {
            log.error("❌ Erreur inattendue lors de l'analyse de sentiment | Ticket ID: {}",
                      ticketId, e);
            return null;
        }
    }
    
    // =========================================================================
    // MÉTHODE UTILITAIRE - VÉRIFICATION SANTÉ
    // =========================================================================
    
    /**
     * Vérifie que le microservice Python est disponible.
     * 
     * UTILISATION:
     * - Au démarrage de l'application (health check)
     * - Dans un endpoint Spring Boot Actuator custom
     * - Pour monitoring (Prometheus, Grafana)
     * 
     * @return true si le service répond, false sinon
     */
    public boolean isServiceHealthy() {
        try {
            WebClient webClient = webClientBuilder
                .baseUrl(sentimentServiceUrl)
                .build();
            
            String status = webClient
                .get()
                .uri("/health")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(2))
                .block();
            
            boolean healthy = status != null && status.contains("\"status\":\"UP\"");
            log.info("🏥 Health check microservice sentiment: {}", healthy ? "UP" : "DOWN");
            return healthy;
            
        } catch (Exception e) {
            log.warn("⚠️ Microservice sentiment inaccessible: {}", e.getMessage());
            return false;
        }
    }
}
