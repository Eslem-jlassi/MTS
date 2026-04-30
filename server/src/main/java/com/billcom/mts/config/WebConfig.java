package com.billcom.mts.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.List;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Configuration CORS centralisée.
 * Les origines autorisées sont configurées dans application.yaml (cors.allowed-origins).
 * Seul le bean corsConfigurationSource est utilisé (via SecurityConfig .cors(withDefaults())).
 *
 * Also registers a servlet filter that sets Cross-Origin-Opener-Policy to
 * "same-origin-allow-popups" so that Google Sign-In popup flows can communicate
 * back to the opener window via postMessage without being blocked by the browser.
 */
@Configuration
public class WebConfig {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .collect(Collectors.toList());

        config.setAllowedOrigins(origins.isEmpty() ? List.of("http://localhost:3000") : origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Cache-Control",
                "X-Request-ID"
        ));
        config.setExposedHeaders(List.of(
                "Authorization",
                "Set-Cookie",
                "X-Request-ID"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Sets Cross-Origin-Opener-Policy: same-origin-allow-popups on every response.
     *
     * The stricter "same-origin" default blocks window.postMessage calls from
     * Google's OAuth popup back to the opener, causing the GSI flow to fail with
     * "Cross-Origin-Opener-Policy policy would block the window.postMessage call".
     * Using "same-origin-allow-popups" retains isolation while permitting the
     * postMessage channel that Google Sign-In requires.
     */
    @Bean
    public Filter crossOriginOpenerPolicyFilter() {
        return new Filter() {
            @Override
            public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                    throws IOException, ServletException {
                if (response instanceof HttpServletResponse httpResponse) {
                    httpResponse.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
                }
                chain.doFilter(request, response);
            }
        };
    }

    @Bean
    public RestTemplate restTemplate(
            @Value("${ai.http.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${ai.http.read-timeout-ms:10000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }
}
