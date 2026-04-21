package com.billcom.mts.config;

// =============================================================================
// IMPORTS - Configuration de la securite Spring Security
// =============================================================================

import com.billcom.mts.config.handler.FilterChainExceptionHandler;
import com.billcom.mts.config.handler.RestAccessDeniedHandler;
import com.billcom.mts.config.handler.RestAuthenticationEntryPoint;
import com.billcom.mts.security.JwtAuthenticationFilter;
import com.billcom.mts.security.MtsUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutFilter;

import static org.springframework.security.config.Customizer.withDefaults;

// =============================================================================
// CONFIGURATION DE SECURITE - Classe principale
// =============================================================================
/**
 * SecurityConfig - Configuration centrale de la securite de l'application.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = new String[] {
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/google",
            "/api/auth/google/config",
            "/api/auth/refresh",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/verify-email",
            "/api/auth/resend-verification",
            "/api/users/avatars/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/actuator/health",
            "/ws/**"
    };

    private static final String ADMIN = "ADMIN";
    private static final String MANAGER = "MANAGER";
    private static final String AGENT = "AGENT";
    private static final String CLIENT = "CLIENT";

    private final FilterChainExceptionHandler filterChainExceptionHandler;
    private final JwtAuthenticationFilter jwtAuthFilter;
    private final MtsUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()

                        // Admin global
                        .requestMatchers("/api/admin/**").hasRole(ADMIN)
                        .requestMatchers("/api/auth/register/admin").hasRole(ADMIN)

                        // Services telecom
                        .requestMatchers(HttpMethod.POST, "/api/services/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/services/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/services/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PATCH, "/api/services/*/status").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.GET, "/api/services").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.GET, "/api/services/health").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.GET, "/api/services/topology").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.GET, "/api/services/*/status-history").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.GET, "/api/services/*/status-history/recent").hasAnyRole(ADMIN, MANAGER)

                        // Manager / Admin
                        .requestMatchers("/api/reports/**").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers("/api/tickets/*/assign").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.GET, "/api/clients/**").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers("/api/users/agents/available").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers("/api/manager-ai/**").hasRole(MANAGER)

                        // Agent / Manager / Admin
                        .requestMatchers("/api/tickets/*/status").hasAnyRole(ADMIN, MANAGER, AGENT)
                        .requestMatchers("/api/tickets/*/comments").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/tickets/*/hard-delete").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/tickets/*/hard-delete/challenge").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/incidents/*/hard-delete").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/incidents/*/hard-delete/challenge").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/clients/*/hard-delete/challenge").hasRole(ADMIN)

                        // Client
                        .requestMatchers(HttpMethod.POST, "/api/tickets").hasRole(CLIENT)

                        // Utilisateurs / administration
                        .requestMatchers(HttpMethod.GET, "/api/users").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/users/role/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/users/count").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/users/internal").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/role").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/password").hasRole(ADMIN)
                        .requestMatchers("/api/users/*/activate").hasRole(ADMIN)
                        .requestMatchers("/api/users/*/deactivate").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/users/*/hard-delete").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/users/*/hard-delete/challenge").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/users/*/reset-password").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/clients").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/clients/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/clients/*/archive").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/clients/*/restore").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/clients/*/hard-delete").hasRole(ADMIN)

                        // Ressources authentifiees
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/tickets/**").authenticated()
                        .requestMatchers("/api/users/me/**").authenticated()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/logout").authenticated()
                        .requestMatchers("/api/services/my-services").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/services/active").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/services/category/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/services/*").authenticated()
                        .requestMatchers("/api/dashboard/stats", "/api/dashboard/stats/**").authenticated()
                        .requestMatchers("/api/dashboard/my-stats").authenticated()

                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(filterChainExceptionHandler, LogoutFilter.class)
                .userDetailsService(userDetailsService)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
