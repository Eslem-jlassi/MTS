package com.billcom.mts.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;

import static com.billcom.mts.controller.AuthController.AUTH_TOKEN;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Value("${app.auth.require-email-verification:false}")
    private boolean requireEmailVerification;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String token = extractTokenFromHeader(request);
        log.debug("[JWT Filter] Token from header: {}", token != null ? "Found" : "Not found");

        if (token == null) {
            token = extractTokenFromCookie(request);
            log.debug("[JWT Filter] Token from cookie: {}", token != null ? "Found" : "Not found");
        }

        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (jwtService.isTokenExpired(token)) {
                log.warn("[JWT Filter] Token expired for {}", request.getRequestURI());
                filterChain.doFilter(request, response);
                return;
            }
        } catch (Exception ex) {
            log.error("[JWT Filter] Invalid token for {}: {}", request.getRequestURI(), ex.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        String username = jwtService.extractUsername(token);

        if (isNotBlank(username) && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (requireEmailVerification
                    && userDetails instanceof com.billcom.mts.entity.User user
                    && !Boolean.TRUE.equals(user.getEmailVerified())) {
                log.warn("[JWT Filter] Unverified account blocked for protected access: {}", username);
                filterChain.doFilter(request, response);
                return;
            }

            if (jwtService.isTokenValid(token, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.info("[JWT Filter] User {} authenticated successfully with roles: {}", username, userDetails.getAuthorities());
            } else {
                log.warn("[JWT Filter] Token validation failed for user: {}", username);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromHeader(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        return Arrays.stream(cookies)
                .filter(cookie -> cookie.getName().equals(AUTH_TOKEN))
                .map(Cookie::getValue)
                .findAny()
                .orElse(null);
    }
}
