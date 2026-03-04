package com.billcom.mts.controller;

import com.billcom.mts.dto.user.UserResponse;
import com.billcom.mts.dto.user.UserUpdateRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * User management controller for MTS Telecom.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User and agent management")
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List all users with pagination")
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userService.getAllUsers(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #id == authentication.principal.id")
    @Operation(summary = "Get user by ID")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user info")
    public UserResponse getCurrentUser(@AuthenticationPrincipal User user) {
        return userService.getUserById(user.getId());
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile")
    public UserResponse updateCurrentUser(
            @Valid @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal User user) {
        return userService.updateUser(user.getId(), request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Update user profile")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        return userService.updateUser(id, request);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user role (Admin only)")
    public UserResponse updateUserRole(
            @PathVariable Long id,
            @RequestParam UserRole role) {
        return userService.updateUserRole(id, role);
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate user account (Admin only)")
    public void deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Activate user account (Admin only)")
    public void activateUser(@PathVariable Long id) {
        userService.activateUser(id);
    }

    @GetMapping("/role/{role}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get users by role")
    public List<UserResponse> getUsersByRole(@PathVariable UserRole role) {
        return userService.getUsersByRole(role);
    }

    @GetMapping("/agents/available")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get available agents for ticket assignment")
    public List<UserResponse> getAvailableAgents() {
        return userService.getAvailableAgents();
    }

    /**
     * Nombre total d'utilisateurs (KPI dashboard Admin).
     * Retourne un objet JSON { "count": N }
     */
    @GetMapping("/count")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Nombre total d'utilisateurs (KPI dashboard Admin)")
    public ResponseEntity<Map<String, Long>> count() {
        return ResponseEntity.ok(Map.of("count", userService.count()));
    }

    @GetMapping("/authorized")
    @Operation(summary = "Check if user is authenticated")
    public ResponseEntity<Void> isAuthorized(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok().build();
    }

    // =========================================================================
    // NOTIFICATION PREFERENCES
    // =========================================================================

    /**
     * POST /api/users/me/notification-preferences
     * Sauvegarde les préférences de notification de l'utilisateur connecté.
     * Le body est un JSON libre (clé/valeur boolean).
     */
    @PostMapping("/me/notification-preferences")
    @Operation(summary = "Sauvegarder les préférences de notification")
    public ResponseEntity<Map<String, Object>> updateNotificationPreferences(
            @RequestBody Map<String, Object> preferences,
            @AuthenticationPrincipal User user) {
        userService.updateNotificationPreferences(user.getId(), preferences);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * GET /api/users/me/notification-preferences
     * Récupère les préférences de notification de l'utilisateur connecté.
     */
    @GetMapping("/me/notification-preferences")
    @Operation(summary = "Récupérer les préférences de notification")
    public ResponseEntity<String> getNotificationPreferences(
            @AuthenticationPrincipal User user) {
        String prefs = userService.getNotificationPreferences(user.getId());
        return ResponseEntity.ok(prefs != null ? prefs : "{}");
    }
}
