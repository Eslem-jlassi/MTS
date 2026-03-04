package com.billcom.mts.exception;

import com.billcom.mts.dto.common.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ============================================================================
 * GlobalExceptionHandler - Centralized Error Handling (RFC 7807)
 * ============================================================================
 * 
 * IMPROVEMENTS:
 * - Added traceId for error correlation in logs
 * - Added handlers for: ConflictException, TooManyRequestsException,
 *   ConstraintViolationException, HttpMessageNotReadableException,
 *   HttpRequestMethodNotSupportedException, DataIntegrityViolationException,
 *   MissingServletRequestParameterException, MethodArgumentTypeMismatchException
 * - Consistent RFC 7807 format for ALL error responses
 * - Structured logging with traceId for debugging
 * 
 * ============================================================================
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final MediaType PROBLEM_JSON = MediaType.parseMediaType("application/problem+json");

    /**
     * Wraps ProblemDetail into a ResponseEntity with correct content type and traceId.
     */
    private static ResponseEntity<ProblemDetail> problem(ProblemDetail body, HttpStatus status) {
        // Add traceId for error correlation
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        if (body.getProperties() == null) {
            body.setProperties(new HashMap<>());
        }
        body.getProperties().put("traceId", traceId);
        return ResponseEntity.status(status).contentType(PROBLEM_JSON).body(body);
    }

    // ==================== 4xx Client Errors ====================

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ProblemDetail> handleBadRequest(BadRequestException ex, HttpServletRequest request) {
        log.warn("Bad request: {}", ex.getMessage());
        return problem(
            ProblemDetail.badRequest(ex.getMessage(), request.getRequestURI()),
            HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ProblemDetail> handleUnauthorized(UnauthorizedException ex, HttpServletRequest request) {
        log.warn("Unauthorized: {}", ex.getMessage());
        return problem(
            ProblemDetail.unauthorized(ex.getMessage(), request.getRequestURI()),
            HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ProblemDetail> handleForbidden(ForbiddenException ex, HttpServletRequest request) {
        log.warn("Forbidden: {}", ex.getMessage());
        return problem(
            ProblemDetail.forbidden(ex.getMessage(), request.getRequestURI()),
            HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("Not found: {}", ex.getMessage());
        return problem(
            ProblemDetail.notFound(ex.getMessage(), request.getRequestURI()),
            HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> handleConflict(ConflictException ex, HttpServletRequest request) {
        log.warn("Conflict: {}", ex.getMessage());
        ProblemDetail detail = ProblemDetail.builder()
            .title("Conflict")
            .status(409)
            .detail(ex.getMessage())
            .instance(request.getRequestURI())
            .timestamp(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC))
            .build();
        return problem(detail, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ProblemDetail> handleTooManyRequests(TooManyRequestsException ex, HttpServletRequest request) {
        log.warn("Rate limit exceeded: {} from {}", ex.getMessage(), request.getRemoteAddr());
        ProblemDetail detail = ProblemDetail.builder()
            .title("Too Many Requests")
            .status(429)
            .detail(ex.getMessage())
            .instance(request.getRequestURI())
            .timestamp(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC))
            .build();
        if (detail.getProperties() == null) {
            detail.setProperties(new HashMap<>());
        }
        detail.getProperties().put("retryAfterSeconds", ex.getRetryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .contentType(PROBLEM_JSON)
            .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
            .body(detail);
    }

    // ==================== Authentication & Security ====================

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ProblemDetail> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        log.warn("Bad credentials: {}", ex.getMessage());
        return problem(
            ProblemDetail.unauthorized("Invalid email or password", request.getRequestURI()),
            HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied: {}", ex.getMessage());
        return problem(
            ProblemDetail.forbidden("Access denied", request.getRequestURI()),
            HttpStatus.FORBIDDEN);
    }

    // ==================== Validation Errors ====================

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(fieldName, message);
        });
        log.warn("Validation failed: {}", errors);
        ProblemDetail detail = ProblemDetail.badRequest("Validation failed", request.getRequestURI())
            .withValidationErrors(errors);
        return problem(detail, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, String> errors = ex.getConstraintViolations().stream()
            .collect(Collectors.toMap(
                v -> v.getPropertyPath().toString(),
                v -> v.getMessage(),
                (msg1, msg2) -> msg1 + "; " + msg2
            ));
        log.warn("Constraint violation: {}", errors);
        ProblemDetail detail = ProblemDetail.badRequest("Constraint violation", request.getRequestURI())
            .withValidationErrors(errors);
        return problem(detail, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ProblemDetail> handleMissingParam(MissingServletRequestParameterException ex, HttpServletRequest request) {
        log.warn("Missing parameter: {}", ex.getMessage());
        return problem(
            ProblemDetail.badRequest("Missing required parameter: " + ex.getParameterName(), request.getRequestURI()),
            HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetail> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String message = String.format("Parameter '%s' must be of type %s", 
            ex.getName(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");
        log.warn("Type mismatch: {}", message);
        return problem(
            ProblemDetail.badRequest(message, request.getRequestURI()),
            HttpStatus.BAD_REQUEST);
    }

    // ==================== Request Format Errors ====================

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleMalformedJson(HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("Malformed request body: {}", ex.getMessage());
        return problem(
            ProblemDetail.badRequest("Malformed request body. Please verify JSON syntax.", request.getRequestURI()),
            HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ProblemDetail> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        String message = String.format("HTTP method '%s' is not supported for this endpoint. Supported: %s",
            ex.getMethod(), 
            ex.getSupportedHttpMethods() != null ? ex.getSupportedHttpMethods().toString() : "unknown");
        log.warn("Method not supported: {}", message);
        ProblemDetail detail = ProblemDetail.builder()
            .title("Method Not Allowed")
            .status(405)
            .detail(message)
            .instance(request.getRequestURI())
            .timestamp(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC))
            .build();
        return problem(detail, HttpStatus.METHOD_NOT_ALLOWED);
    }

    // ==================== Database Errors ====================

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.error("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        // Don't expose internal DB details to clients
        return problem(
            ProblemDetail.builder()
                .title("Conflict")
                .status(409)
                .detail("Operation conflicts with existing data. This may be a duplicate entry or a referential constraint.")
                .instance(request.getRequestURI())
                .timestamp(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC))
                .build(),
            HttpStatus.CONFLICT);
    }

    // ==================== Catch-all ====================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneral(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error on {} {}: ", request.getMethod(), request.getRequestURI(), ex);
        return problem(
            ProblemDetail.internalError(request.getRequestURI()),
            HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
