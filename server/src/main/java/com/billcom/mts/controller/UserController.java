package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.RegisterRequest;
import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.dto.user.AdminPasswordSetRequest;
import com.billcom.mts.dto.user.AdminUserCreateRequest;
import com.billcom.mts.dto.user.ChangePasswordRequest;
import com.billcom.mts.dto.user.UserResponse;
import com.billcom.mts.dto.user.UserRoleUpdateRequest;
import com.billcom.mts.dto.user.UserUpdateRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.service.AuditLogService;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.SensitiveActionVerificationService;
import com.billcom.mts.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    private final AuthService authService;
    private final UserService userService;
    private final AuditLogService auditLogService;
    private final SensitiveActionVerificationService sensitiveActionVerificationService;
    private final ObjectMapper objectMapper;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all users with pagination")
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userService.getAllUsers(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
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

    @PutMapping("/me/change-password")
    @Operation(summary = "Changer le mot de passe de l'utilisateur connecte")
    public ResponseEntity<Map<String, Boolean>> changeCurrentUserPassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User user) {
        userService.changePassword(user.getId(), request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload current user avatar")
    public UserResponse uploadCurrentUserAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        return userService.uploadAvatar(user.getId(), file);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Update user profile")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        return userService.updateUser(id, request);
    }

    @PostMapping("/internal")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Creer un utilisateur interne (Admin uniquement)")
    public UserResponse createInternalUser(
            @Valid @RequestBody AdminUserCreateRequest request,
            @AuthenticationPrincipal User admin,
            Authentication authentication) {
        if (request.getRole() == UserRole.CLIENT) {
            throw new BadRequestException("Utilisez la gestion des clients pour creer un compte client");
        }

        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .confirmPassword(request.getConfirmPassword())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .role(request.getRole())
                .build();

        Long createdUserId = authService.registerByAdmin(
                registerRequest,
                resolveAuthenticatedUserId(admin, authentication)
        ).getUser().getId();
        return userService.getUserById(createdUserId);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user role (Admin only)")
    public UserResponse updateUserRole(
            @PathVariable Long id,
            @RequestBody(required = false) UserRoleUpdateRequest request,
            @RequestParam(required = false) UserRole role) {
        UserRole resolvedRole = request != null && request.getRole() != null ? request.getRole() : role;
        if (resolvedRole == null) {
            throw new BadRequestException("Le role est obligatoire");
        }
        return userService.updateUserRole(id, resolvedRole);
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate user account (Admin only)")
    public void deactivateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        User targetUser = userService.getUserEntityById(id);
        userService.deactivateUser(id);
        auditLogService.log(
                AuditAction.USER_DEACTIVATED,
                "User",
                targetUser.getId(),
                targetUser.getFullName(),
                "Desactivation du compte " + targetUser.getEmail(),
                "isActive=true",
                "isActive=false",
                admin,
                httpRequest
        );
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Activate user account (Admin only)")
    public void activateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        User targetUser = userService.getUserEntityById(id);
        userService.activateUser(id);
        auditLogService.log(
                AuditAction.USER_ACTIVATED,
                "User",
                targetUser.getId(),
                targetUser.getFullName(),
                "Reactivation du compte " + targetUser.getEmail(),
                "isActive=false",
                "isActive=true",
                admin,
                httpRequest
        );
    }

    @DeleteMapping("/{id}/hard-delete")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer definitivement un utilisateur si c'est safe")
    public ResponseEntity<Map<String, String>> hardDeleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody AdminHardDeleteRequest deleteRequest,
            HttpServletRequest httpRequest) {
        if (admin != null && admin.getId() != null && admin.getId().equals(id)) {
            throw new BadRequestException("Vous ne pouvez pas supprimer definitivement votre propre compte");
        }

        User targetUser = userService.getUserEntityById(id);
        if (targetUser.getClientProfile() != null) {
            throw new BadRequestException(
                    "Utilisez la suppression client dediee depuis le module Clients"
            );
        }

        String expectedHardDeleteIdentifier = buildUserHardDeleteIdentifier(targetUser);

        sensitiveActionVerificationService.verifyHardDeleteAuthorization(
                admin,
            expectedHardDeleteIdentifier,
                deleteRequest,
            "la suppression definitive du compte interne ID "
                + expectedHardDeleteIdentifier
                + " ("
                + targetUser.getEmail()
                + ")"
        );

        String oldValue = String.format(
                "email=%s, role=%s, active=%s",
                targetUser.getEmail(),
                targetUser.getRole(),
                targetUser.getIsActive()
        );

        userService.hardDeleteUserByAdmin(id, admin);

        auditLogService.log(
                AuditAction.USER_DELETED,
                "User",
                id,
                targetUser.getFullName(),
                "Suppression definitive du compte " + targetUser.getEmail(),
                oldValue,
                null,
                admin,
                httpRequest
        );

        return ResponseEntity.ok(Map.of("message", "Utilisateur supprime definitivement"));
    }

    @PostMapping("/{id}/hard-delete/challenge")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Envoie un code de verification email pour confirmer une suppression definitive d'utilisateur")
    public ResponseEntity<Map<String, String>> issueHardDeleteChallenge(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {
        if (admin != null && admin.getId() != null && admin.getId().equals(id)) {
            throw new BadRequestException("Vous ne pouvez pas supprimer definitivement votre propre compte");
        }

        User targetUser = userService.getUserEntityById(id);
        if (targetUser.getClientProfile() != null) {
            throw new BadRequestException(
                    "Utilisez la suppression client dediee depuis le module Clients"
            );
        }

        sensitiveActionVerificationService.issueHardDeleteVerificationCode(
                admin,
            "la suppression definitive du compte interne ID "
                + buildUserHardDeleteIdentifier(targetUser)
                + " ("
                + targetUser.getEmail()
                + ")"
        );

        auditLogService.log(
                AuditAction.USER_UPDATED,
                "User",
                id,
                targetUser.getFullName(),
                "Challenge de verification emis avant suppression definitive du compte " + targetUser.getEmail(),
                admin,
                httpRequest
        );

        return ResponseEntity.ok(Map.of("message", "Code de verification envoye"));
    }

    private String buildUserHardDeleteIdentifier(User user) {
        return String.valueOf(user.getId());
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Definir un nouveau mot de passe pour un utilisateur (Admin uniquement)")
    public ResponseEntity<Map<String, Boolean>> setUserPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminPasswordSetRequest request) {
        userService.setPasswordByAdmin(id, request.getNewPassword());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Envoyer un email de reinitialisation du mot de passe")
    public ResponseEntity<Map<String, Boolean>> resetUserPassword(@PathVariable Long id) {
        User targetUser = userService.getUserEntityById(id);
        authService.forgotPassword(targetUser.getEmail());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN')")
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

    @PostMapping("/me/notification-preferences")
    @Operation(summary = "Sauvegarder les preferences de notification")
    public ResponseEntity<Map<String, Object>> updateNotificationPreferences(
            @RequestBody Map<String, Object> preferences,
            @AuthenticationPrincipal User user) {
        userService.updateNotificationPreferences(user.getId(), preferences);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/me/notification-preferences")
    @Operation(summary = "Recuperer les preferences de notification")
    public ResponseEntity<Map<String, Object>> getNotificationPreferences(
            @AuthenticationPrincipal User user) {
        String prefs = userService.getNotificationPreferences(user.getId());
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(
                    prefs != null ? prefs : "{}",
                    Map.class
            );
            return ResponseEntity.ok(parsed);
        } catch (JsonProcessingException ex) {
            return ResponseEntity.ok(Map.of());
        }
    }

    @GetMapping("/avatars/{filename:.+}")
    @Operation(summary = "Recuperer un avatar utilisateur")
    public ResponseEntity<Resource> getAvatar(@PathVariable String filename) {
        Resource resource = userService.getAvatarResource(filename);
        String contentType = userService.getAvatarContentType(filename);

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    private Long resolveAuthenticatedUserId(User authenticatedUser, Authentication authentication) {
        if (authenticatedUser != null && authenticatedUser.getId() != null) {
            return authenticatedUser.getId();
        }

        Authentication resolvedAuthentication = authentication != null
                ? authentication
                : SecurityContextHolder.getContext().getAuthentication();

        if (resolvedAuthentication != null && resolvedAuthentication.getName() != null) {
            return userService.getUserByEmail(resolvedAuthentication.getName()).getId();
        }

        throw new UnauthorizedException("Utilisateur authentifie introuvable");
    }
}
