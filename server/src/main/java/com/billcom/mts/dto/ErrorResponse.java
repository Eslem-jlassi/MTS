package com.billcom.mts.dto;

/**
 * DTO standard pour les réponses d'erreur de l'API.
 */
public record ErrorResponse(String message, String code) {
    public ErrorResponse(String message) {
        this(message, null);
    }
}
