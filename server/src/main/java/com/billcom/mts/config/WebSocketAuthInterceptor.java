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
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        if (accessor.getUser() != null) {
            log.debug("[WebSocket] Session HTTP authentifiée détectée pour {}", accessor.getUser().getName());
            return message;
        }

        Authentication existingAuthentication = SecurityContextHolder.getContext().getAuthentication();
        if (isAuthenticated(existingAuthentication)) {
            accessor.setUser(existingAuthentication);
            log.debug("[WebSocket] Contexte Spring Security réutilisé pour {}", existingAuthentication.getName());
            return message;
        }

        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("[WebSocket] Connexion refusée: aucune session HTTP authentifiée ni header Authorization valide");
            throw new IllegalArgumentException("Authentification WebSocket requise");
        }

        String jwt = authHeader.substring(7);
        String userEmail = jwtService.extractUsername(jwt);
        UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

        if (!jwtService.isTokenValid(jwt, userDetails)) {
            log.warn("[WebSocket] Connexion refusée: token invalide pour {}", userEmail);
            throw new IllegalArgumentException("Token WebSocket invalide");
        }

        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        SecurityContextHolder.getContext().setAuthentication(authToken);
        accessor.setUser(authToken);
        log.info("[WebSocket] Utilisateur authentifié via STOMP CONNECT: {}", userEmail);
        return message;
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }
}
