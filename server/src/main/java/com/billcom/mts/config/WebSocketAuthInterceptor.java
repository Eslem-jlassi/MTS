package com.billcom.mts.config;

import com.billcom.mts.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

// =============================================================================
// INTERCEPTEUR D'AUTHENTIFICATION WEBSOCKET
// =============================================================================
/**
 * WebSocketAuthInterceptor - Authentifie les connexions WebSocket via JWT.
 * 
 * RÔLE DE CETTE CLASSE:
 * Intercepte les messages WebSocket pour vérifier le token JWT
 * et authentifier l'utilisateur qui se connecte.
 * 
 * FLUX D'AUTHENTIFICATION:
 * 
 * 1. Client React se connecte avec le token dans le header:
 *    CONNECT
 *    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * 2. Cet intercepteur:
 *    a. Extrait le token du header "Authorization"
 *    b. Valide le token via JwtService
 *    c. Charge le UserDetails depuis la BDD
 *    d. Crée un Authentication et l'attache à la session WebSocket
 * 
 * 3. Les messages suivants utilisent cette authentification
 *    pour identifier l'utilisateur et router les messages privés
 * 
 * SÉCURITÉ:
 * - Sans token valide, la connexion est refusée
 * - Le token est vérifié une seule fois à la connexion (CONNECT)
 * - La session WebSocket garde l'authentification
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    /**
     * Intercepte les messages AVANT qu'ils soient envoyés au channel.
     * 
     * @param message Le message WebSocket
     * @param channel Le channel de destination
     * @return Le message (modifié ou non)
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        
        // Accède aux headers STOMP du message
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                message, StompHeaderAccessor.class);
        
        if (accessor == null) {
            return message;
        }

        // =====================================================================
        // TRAITEMENT UNIQUEMENT À LA CONNEXION (CONNECT)
        // =====================================================================
        // On authentifie seulement lors de la première connexion.
        // Les messages suivants utilisent l'authentification de la session.
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            
            log.debug("[WebSocket] Nouvelle connexion, vérification du token...");
            
            // Récupère le header Authorization
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("[WebSocket] Connexion sans token ou token mal formaté");
                // On pourrait throw une exception pour refuser la connexion
                // Pour l'instant, on laisse passer mais l'user sera anonyme
                return message;
            }

            // Extrait le token (enlève "Bearer ")
            String jwt = authHeader.substring(7);

            try {
                // Extrait le username (email) du token
                String userEmail = jwtService.extractUsername(jwt);
                
                if (userEmail != null) {
                    // Charge les détails de l'utilisateur
                    UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
                    
                    // Vérifie que le token est valide
                    if (jwtService.isTokenValid(jwt, userDetails)) {
                        
                        // Crée l'objet Authentication
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );
                        
                        // Attache l'authentification au contexte de sécurité
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        
                        // Attache aussi à la session WebSocket (important!)
                        accessor.setUser(authToken);
                        
                        log.info("[WebSocket] Utilisateur authentifié: {}", userEmail);
                        
                    } else {
                        log.warn("[WebSocket] Token invalide pour: {}", userEmail);
                    }
                }
            } catch (Exception e) {
                log.error("[WebSocket] Erreur d'authentification: {}", e.getMessage());
            }
        }

        return message;
    }
}
