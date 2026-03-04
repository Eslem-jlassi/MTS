package com.billcom.mts.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception for rate limiting (HTTP 429).
 * 
 * Use when:
 * - Too many requests from a client
 * - Rate limiter threshold exceeded
 * - Brute force protection triggered
 * 
 * Example:
 *   throw new TooManyRequestsException("Too many login attempts. Please try again in 60 seconds.");
 */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class TooManyRequestsException extends RuntimeException {
    
    /** Seconds until the rate limit resets. */
    private final int retryAfterSeconds;
    
    public TooManyRequestsException(String message) {
        super(message);
        this.retryAfterSeconds = 60;
    }
    
    public TooManyRequestsException(String message, int retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }
    
    public TooManyRequestsException(String message, Throwable cause) {
        super(message, cause);
        this.retryAfterSeconds = 60;
    }
    
    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
