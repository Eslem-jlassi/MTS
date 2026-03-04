package com.billcom.mts.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception for resource conflicts (HTTP 409).
 * 
 * Use when:
 * - Attempting to create a resource that already exists
 * - Optimistic locking conflicts
 * - Concurrent modification detected
 * 
 * Example:
 *   throw new ConflictException("A user with email 'john@example.com' already exists");
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
    
    public ConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
