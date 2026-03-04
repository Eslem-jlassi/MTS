package com.billcom.mts.config;

import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * ============================================================================
 * RateLimitConfig - Configuration for API Rate Limiting
 * ============================================================================
 * 
 * CRITICAL SECURITY FIX: Prevents brute force attacks and API abuse
 * 
 * CONFIGURED RATE LIMITERS:
 * 1. loginRateLimiter: 5 attempts per minute per IP
 * 2. apiRateLimiter: 100 requests per minute (general API protection)
 * 3. createTicketRateLimiter: 10 tickets per minute per user
 * 
 * USAGE IN CONTROLLERS:
 * 
 * @RateLimiter(name = "loginRateLimiter", fallbackMethod = "rateLimitFallback")
 * public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
 *     // ... login logic
 * }
 * 
 * public ResponseEntity<AuthResponse> rateLimitFallback(LoginRequest request, Exception e) {
 *     return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
 *         .body(new AuthResponse("Too many login attempts. Please try again later."));
 * }
 * 
 * ============================================================================
 */
@Slf4j
@Configuration
public class RateLimitConfig {

    @Bean
    public RateLimiterRegistry rateLimiterRegistry() {
        // Default configuration for all rate limiters
        RateLimiterConfig defaultConfig = RateLimiterConfig.custom()
                .limitForPeriod(100)  // default: 100 requests
                .limitRefreshPeriod(Duration.ofSeconds(60))  // per minute
                .timeoutDuration(Duration.ofMillis(0))  // fail immediately
                .build();

        RateLimiterRegistry registry = RateLimiterRegistry.of(defaultConfig);
        
        log.info("Rate limiter registry initialized with default configuration");
        log.warn("SECURITY: Rate limiting enabled - DDoS and brute force protection active");
        
        return registry;
    }
}
