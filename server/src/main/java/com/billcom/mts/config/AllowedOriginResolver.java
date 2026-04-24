package com.billcom.mts.config;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Resolveur centralise des origines HTTP / WebSocket.
 * En developpement, on complete automatiquement les variantes localhost/127.0.0.1
 * sur 3000 et 3001 pour eviter les pannes CORS quand CRA change de port.
 */
final class AllowedOriginResolver {

    private static final List<String> LOCAL_DEV_ORIGINS = List.of(
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
    );

    private AllowedOriginResolver() {
    }

    static List<String> resolve(String configuredOrigins, String frontendBaseUrl) {
        Set<String> resolvedOrigins = new LinkedHashSet<>();
        addOrigins(resolvedOrigins, configuredOrigins);
        addOrigin(resolvedOrigins, frontendBaseUrl);

        boolean localDevelopment = resolvedOrigins.isEmpty()
                || resolvedOrigins.stream().anyMatch(AllowedOriginResolver::isLocalOrigin)
                || isLocalOrigin(frontendBaseUrl);

        if (localDevelopment) {
            resolvedOrigins.addAll(LOCAL_DEV_ORIGINS);
        }

        return new ArrayList<>(resolvedOrigins);
    }

    static String[] resolveAsArray(String configuredOrigins, String frontendBaseUrl) {
        return resolve(configuredOrigins, frontendBaseUrl).toArray(String[]::new);
    }

    private static void addOrigins(Set<String> origins, String rawOrigins) {
        if (rawOrigins == null || rawOrigins.isBlank()) {
            return;
        }

        for (String origin : rawOrigins.split(",")) {
            addOrigin(origins, origin);
        }
    }

    private static void addOrigin(Set<String> origins, String origin) {
        if (origin == null) {
            return;
        }

        String normalizedOrigin = origin.trim();
        if (!normalizedOrigin.isBlank()) {
            origins.add(normalizedOrigin);
        }
    }

    private static boolean isLocalOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return false;
        }

        try {
            URI uri = URI.create(origin.trim());
            String host = uri.getHost();
            return "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host);
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
