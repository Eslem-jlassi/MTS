package com.billcom.mts.dto.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

/**
 * RFC 7807 Problem Details for HTTP APIs.
 * Standardised error response format for REST APIs.
 *
 * @see <a href="https://tools.ietf.org/html/rfc7807">RFC 7807</a>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ProblemDetail {

    /** URI reference identifying the problem type (optional). */
    private URI type;

    /** Short, human-readable summary of the problem type. */
    private String title;

    /** HTTP status code. */
    private int status;

    /** Human-readable explanation specific to this occurrence. */
    private String detail;

    /** URI reference identifying the specific occurrence (e.g. request path). Stored as path only. */
    private String instance;

    /** Timestamp (ISO-8601). */
    private OffsetDateTime timestamp;

    /** Extension members (e.g. validationErrors, traceId). */
    private Map<String, Object> properties;

    // --- Factory methods for common cases ---

    public static ProblemDetail badRequest(String detail, String instancePath) {
        return ProblemDetail.builder()
            .title("Bad Request")
            .status(400)
            .detail(detail)
            .instance(instancePath)
            .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
            .build();
    }

    public static ProblemDetail unauthorized(String detail, String instancePath) {
        return ProblemDetail.builder()
            .title("Unauthorized")
            .status(401)
            .detail(detail)
            .instance(instancePath)
            .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
            .build();
    }

    public static ProblemDetail forbidden(String detail, String instancePath) {
        return ProblemDetail.builder()
            .title("Forbidden")
            .status(403)
            .detail(detail)
            .instance(instancePath)
            .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
            .build();
    }

    public static ProblemDetail notFound(String detail, String instancePath) {
        return ProblemDetail.builder()
            .title("Not Found")
            .status(404)
            .detail(detail)
            .instance(instancePath)
            .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
            .build();
    }

    public static ProblemDetail internalError(String instancePath) {
        return ProblemDetail.builder()
            .title("Internal Server Error")
            .status(500)
            .detail("An unexpected error occurred.")
            .instance(instancePath)
            .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
            .build();
    }

    /** Validation errors: map field name -> error message(s). */
    public ProblemDetail withValidationErrors(Map<String, ?> validationErrors) {
        if (properties == null) {
            properties = new java.util.HashMap<>();
        }
        properties.put("validationErrors", validationErrors);
        return this;
    }
}
