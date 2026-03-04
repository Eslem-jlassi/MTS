package com.billcom.mts.dto.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Standard API error response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiError {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private Map<String, List<String>> fieldErrors;
    private Map<String, String> validationErrors;

    public static ApiError of(int status, String error, String message, String path) {
        return ApiError.builder()
            .timestamp(LocalDateTime.now())
            .status(status)
            .error(error)
            .message(message)
            .path(path)
            .build();
    }

    public static ApiError badRequest(String message, String path) {
        return of(400, "Bad Request", message, path);
    }

    public static ApiError unauthorized(String message, String path) {
        return of(401, "Unauthorized", message, path);
    }

    public static ApiError forbidden(String message, String path) {
        return of(403, "Forbidden", message, path);
    }

    public static ApiError notFound(String message, String path) {
        return of(404, "Not Found", message, path);
    }

    public static ApiError internalError(String path) {
        return of(500, "Internal Server Error", "An unexpected error occurred", path);
    }

    public static ApiError validation(String message, String path, Map<String, List<String>> fieldErrors) {
        return ApiError.builder()
            .timestamp(LocalDateTime.now())
            .status(400)
            .error("Validation Error")
            .message(message)
            .path(path)
            .fieldErrors(fieldErrors)
            .build();
    }
}
