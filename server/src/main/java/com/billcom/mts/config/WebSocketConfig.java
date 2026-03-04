package com.billcom.mts.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

// =============================================================================
// CONFIGURATION WEBSOCKET - Notifications temps réel
// =============================================================================
/**
 * WebSocketConfig - Configuration de WebSocket avec STOMP pour les notifications.
 * 
 * RÔLE DE CETTE CLASSE:
 * Configure le support WebSocket pour permettre l'envoi de notifications
 * en temps réel du serveur vers les clients (navigateurs).
 * 
 * ARCHITECTURE:
 * 
 *   CLIENT (React)                          SERVER (Spring Boot)
 *   ────────────────                        ─────────────────────
 *   
 *   1. Connexion WebSocket
 *      ─────────────────────────────────────▶  /ws (endpoint)
 *                                              
 *   2. Subscribe to topics
 *      SUBSCRIBE /user/queue/notifications ──▶
 *      SUBSCRIBE /topic/service-status ─────▶
 *                                              
 *   3. Réception des messages
 *      ◀─────────────────────────────────────  NotificationService.send()
 *                                              via SimpMessagingTemplate
 * 
 * PROTOCOLE STOMP:
 * STOMP (Simple Text Oriented Messaging Protocol) est un protocole
 * de messagerie simple qui fonctionne au-dessus de WebSocket.
 * 
 * TOPICS vs QUEUES:
 * - /topic/xxx : Message broadcast à TOUS les abonnés (ex: status service)
 * - /user/queue/xxx : Message PRIVÉ à UN utilisateur (ex: notification perso)
 * 
 * SÉCURITÉ:
 * - La connexion WebSocket est protégée par le token JWT
 * - Voir WebSocketAuthInterceptor pour l'authentification
 * 
 * FALLBACK SockJS:
 * Si WebSocket n'est pas supporté (vieux navigateur, proxy bloquant),
 * SockJS fournit des alternatives (long-polling, etc.)
 */
@Configuration
@EnableWebSocketMessageBroker  // Active le support WebSocket avec message broker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Configure le message broker (routeur de messages).
     * 
     * Le broker gère la distribution des messages entre producteurs et consommateurs.
     * 
     * @param registry Registry de configuration du broker
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        
        // =====================================================================
        // DESTINATION BROKER (messages du serveur vers les clients)
        // =====================================================================
        // enableSimpleBroker: Active un broker simple en mémoire
        // Préfixes des destinations gérées par ce broker:
        // - /topic : Pour les messages broadcast (ex: changement status service)
        // - /queue : Pour les messages privés (via /user/queue/xxx)
        registry.enableSimpleBroker("/topic", "/queue");
        
        // =====================================================================
        // PRÉFIXE USER (messages privés à un utilisateur)
        // =====================================================================
        // Quand on envoie à "/user/{userId}/queue/notifications",
        // Spring traduit automatiquement en "/user/queue/notifications"
        // pour l'utilisateur authentifié correspondant
        registry.setUserDestinationPrefix("/user");
        
        // =====================================================================
        // PRÉFIXE APPLICATION (messages des clients vers le serveur)
        // =====================================================================
        // Les messages envoyés par les clients avec ce préfixe
        // sont routés vers les @MessageMapping des contrôleurs
        // Ex: client envoie à "/app/chat" -> @MessageMapping("/chat")
        registry.setApplicationDestinationPrefixes("/app");
    }

    /**
     * Enregistre les endpoints WebSocket.
     * 
     * Un endpoint est l'URL à laquelle les clients se connectent.
     * 
     * @param registry Registry des endpoints STOMP
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        
        // =====================================================================
        // ENDPOINT PRINCIPAL: /ws
        // =====================================================================
        // C'est l'URL de connexion WebSocket
        // Les clients React se connectent à: ws://localhost:8080/ws
        registry.addEndpoint("/ws")
                // Autorise les connexions depuis le frontend React
                // TODO: En production, spécifier l'URL exacte du frontend
                .setAllowedOriginPatterns("*")
                // Fallback SockJS pour les navigateurs sans WebSocket natif
                .withSockJS();
        
        // =====================================================================
        // ENDPOINT SANS SOCKJS (pour clients WebSocket natifs)
        // =====================================================================
        // Certains clients préfèrent le WebSocket pur (mobile, Postman)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}
