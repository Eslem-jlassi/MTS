package com.billcom.mts.service.impl;

import com.billcom.mts.dto.user.UserResponse;
import com.billcom.mts.dto.user.UserUpdateRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.AuditLogRepository;
import com.billcom.mts.repository.NotificationRepository;
import com.billcom.mts.repository.RefreshTokenRepository;
import com.billcom.mts.repository.ReportRepository;
import com.billcom.mts.repository.TicketCommentRepository;
import com.billcom.mts.repository.TicketHistoryRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * User service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private static final long MAX_AVATAR_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_AVATAR_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    );

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final TicketHistoryRepository ticketHistoryRepository;
    private final ReportRepository reportRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${users.avatar-upload-dir:uploads/avatars}")
    private String avatarUploadDir;

    @Override
    public UserResponse getUserById(Long id) {
        User user = getUserEntityById(id);
        return mapToResponse(user);
    }

    @Override
    public User getUserEntityById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    @Override
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = getUserEntityById(id);

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.getProfilePhotoUrl());
        }

        user = userRepository.save(user);
        log.info("User updated: {}", user.getEmail());
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateUserRole(Long userId, UserRole role) {
        User user = getUserEntityById(userId);
        user.setRole(role);
        user = userRepository.save(user);
        log.info("User role updated: {} -> {}", user.getEmail(), role);
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = getUserEntityById(userId);

        if (!StringUtils.hasText(currentPassword) || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Le mot de passe actuel est incorrect");
        }

        validatePasswordStrength(newPassword);

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("Le nouveau mot de passe doit etre different de l'ancien");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed for user {}", user.getEmail());
    }

    @Override
    @Transactional
    public void setPasswordByAdmin(Long userId, String newPassword) {
        User user = getUserEntityById(userId);

        validatePasswordStrength(newPassword);

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("Le nouveau mot de passe doit etre different de l'ancien");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password set by admin for user {}", user.getEmail());
    }

    @Override
    @Transactional
    public void deactivateUser(Long userId) {
        User user = getUserEntityById(userId);
        user.setIsActive(false);
        userRepository.save(user);
        log.info("User deactivated: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void activateUser(Long userId) {
        User user = getUserEntityById(userId);
        user.setIsActive(true);
        userRepository.save(user);
        log.info("User activated: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void hardDeleteUserByAdmin(Long userId) {
        User user = getUserEntityById(userId);
        List<String> blockers = collectHardDeleteBlockers(user, false);
        throwIfHardDeleteBlocked(blockers);

        deleteUserEphemeralData(user);
        userRepository.delete(user);
        log.info("User permanently deleted: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void hardDeleteClientAccountByAdmin(Long userId) {
        User user = getUserEntityById(userId);
        if (user.getClientProfile() == null) {
            throw new BadRequestException("Ce compte ne correspond pas a un client");
        }

        List<String> blockers = collectHardDeleteBlockers(user, true);
        throwIfHardDeleteBlocked(blockers);

        deleteUserEphemeralData(user);
        userRepository.delete(user);
        log.info("Client account permanently deleted: {}", user.getEmail());
    }

    @Override
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public List<UserResponse> getUsersByRole(UserRole role) {
        return userRepository.findByRole(role).stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<UserResponse> getAvailableAgents() {
        return userRepository.findByRoleAndIsActiveTrue(UserRole.AGENT).stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserResponse uploadAvatar(Long userId, MultipartFile file) {
        User user = getUserEntityById(userId);
        validateAvatarFile(file);

        Path avatarDirectory = getAvatarDirectory();
        try {
            Files.createDirectories(avatarDirectory);

            String storedFileName = UUID.randomUUID() + resolveAvatarExtension(file);
            Path targetPath = avatarDirectory.resolve(storedFileName).normalize();
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            deletePreviousLocalAvatar(user.getProfilePhotoUrl(), avatarDirectory);

            user.setProfilePhotoUrl("/api/users/avatars/" + storedFileName);
            user = userRepository.save(user);

            log.info("Avatar updated for user {}", user.getEmail());
            return mapToResponse(user);
        } catch (IOException ex) {
            log.error("Failed to store avatar for user {}", user.getEmail(), ex);
            throw new RuntimeException("Erreur lors de l'enregistrement de l'avatar", ex);
        }
    }

    @Override
    public Resource getAvatarResource(String filename) {
        Path avatarPath = resolveAvatarPath(filename);
        try {
            Resource resource = new UrlResource(avatarPath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Erreur lors de la lecture de l'avatar", ex);
        }

        throw new ResourceNotFoundException("Avatar", "filename", filename);
    }

    @Override
    public String getAvatarContentType(String filename) {
        Path avatarPath = resolveAvatarPath(filename);
        try {
            String detected = Files.probeContentType(avatarPath);
            return StringUtils.hasText(detected) ? detected : "application/octet-stream";
        } catch (IOException ex) {
            log.debug("Unable to detect avatar content type for {}: {}", filename, ex.getMessage());
            return "application/octet-stream";
        }
    }

    /**
     * Compte le nombre total d'utilisateurs (KPI dashboard Admin).
     */
    @Override
    public long count() {
        return userRepository.count();
    }

    // ========== Private Methods ==========

    private UserResponse mapToResponse(User user) {
        UserResponse.UserResponseBuilder builder = UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .phone(user.getPhone())
            .role(user.getRole())
            .isActive(user.getIsActive())
            .emailVerified(user.getEmailVerified())
            .profilePhotoUrl(user.getProfilePhotoUrl())
            .oauthProvider(user.getOauthProvider())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .lastLoginAt(user.getLastLoginAt());

        // Add client-specific fields if user has a client profile
        if (user.getClientProfile() != null) {
            builder.clientId(user.getClientProfile().getId())
                   .clientCode(user.getClientProfile().getClientCode())
                   .companyName(user.getClientProfile().getCompanyName());
        }

        return builder.build();
    }

    @Override
    @Transactional
    public void updateNotificationPreferences(Long userId, Map<String, Object> preferences) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé : " + userId));
        try {
            ObjectMapper mapper = new ObjectMapper();
            user.setNotificationPreferences(mapper.writeValueAsString(preferences));
            userRepository.save(user);
            log.info("Préférences de notification mises à jour pour l'utilisateur {}", userId);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Erreur de sérialisation des préférences", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public String getNotificationPreferences(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé : " + userId));
        String prefs = user.getNotificationPreferences();
        return prefs != null ? prefs : "{}";
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier avatar est obligatoire");
        }
        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("L'avatar ne peut pas depasser 5 MB");
        }

        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType) || !ALLOWED_AVATAR_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Format avatar invalide. Utilisez JPG, PNG, WEBP ou GIF.");
        }
    }

    private void validatePasswordStrength(String password) {
        if (!StringUtils.hasText(password) || password.length() < 8) {
            throw new BadRequestException("Le mot de passe doit contenir au moins 8 caracteres");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new BadRequestException("Le mot de passe doit contenir au moins une majuscule");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new BadRequestException("Le mot de passe doit contenir au moins une minuscule");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new BadRequestException("Le mot de passe doit contenir au moins un chiffre");
        }
    }

    private List<String> collectHardDeleteBlockers(User user, boolean allowClientProfileDeletion) {
        List<String> blockers = new ArrayList<>();

        if (user.getRole() == UserRole.ADMIN && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            blockers.add("le dernier administrateur ne peut pas etre supprime");
        }

        if (user.getClientProfile() != null) {
            long clientTicketCount = ticketRepository.countByClientId(user.getClientProfile().getId());
            if (clientTicketCount > 0) {
                blockers.add("le compte client possede " + clientTicketCount + " ticket(s)");
            }
            if (!allowClientProfileDeletion) {
                blockers.add("les comptes clients doivent etre supprimes depuis le module Clients");
            }
        }

        long createdTicketCount = ticketRepository.countByCreatedById(user.getId());
        if (createdTicketCount > 0 && user.getClientProfile() == null) {
            blockers.add("l'utilisateur a cree " + createdTicketCount + " ticket(s)");
        }

        long assignedTicketCount = ticketRepository.countByAssignedToId(user.getId());
        if (assignedTicketCount > 0) {
            blockers.add("l'utilisateur est encore assigne a " + assignedTicketCount + " ticket(s)");
        }

        long commentCount = ticketCommentRepository.countByAuthorId(user.getId());
        if (commentCount > 0) {
            blockers.add("l'utilisateur a redige " + commentCount + " commentaire(s)");
        }

        long historyCount = ticketHistoryRepository.countByUserId(user.getId());
        if (historyCount > 0) {
            blockers.add("l'utilisateur apparait dans " + historyCount + " entree(s) d'historique ticket");
        }

        long reportCount = reportRepository.countByCreatedBy(user);
        if (reportCount > 0) {
            blockers.add("l'utilisateur a genere " + reportCount + " rapport(s)");
        }

        long auditCount = auditLogRepository.countByUserId(user.getId());
        if (auditCount > 0) {
            blockers.add("l'utilisateur apparait dans " + auditCount + " log(s) d'audit");
        }

        return blockers;
    }

    private void throwIfHardDeleteBlocked(List<String> blockers) {
        if (blockers.isEmpty()) {
            return;
        }

        throw new BadRequestException(
            "Suppression definitive impossible: " + String.join("; ", blockers)
        );
    }

    private void deleteUserEphemeralData(User user) {
        refreshTokenRepository.deleteByUserId(user.getId());
        notificationRepository.deleteByUserId(user.getId());
        deletePreviousLocalAvatar(user.getProfilePhotoUrl(), getAvatarDirectory());
    }

    private String resolveAvatarExtension(MultipartFile file) {
        String contentType = file.getContentType();
        if ("image/png".equals(contentType)) {
            return ".png";
        }
        if ("image/webp".equals(contentType)) {
            return ".webp";
        }
        if ("image/gif".equals(contentType)) {
            return ".gif";
        }
        return ".jpg";
    }

    private Path resolveAvatarPath(String filename) {
        String safeFilename = sanitizeFilename(filename);
        Path avatarDirectory = getAvatarDirectory();
        Path resolved = avatarDirectory.resolve(safeFilename).normalize();
        if (!resolved.startsWith(avatarDirectory)) {
            throw new IllegalArgumentException("Nom de fichier avatar invalide");
        }
        return resolved;
    }

    private String sanitizeFilename(String filename) {
        if (!StringUtils.hasText(filename)) {
            throw new IllegalArgumentException("Nom de fichier avatar invalide");
        }

        String candidate = Paths.get(filename).getFileName().toString();
        if (!candidate.equals(filename) || candidate.contains("..")) {
            throw new IllegalArgumentException("Nom de fichier avatar invalide");
        }
        return candidate;
    }

    private Path getAvatarDirectory() {
        return Paths.get(avatarUploadDir).toAbsolutePath().normalize();
    }

    private void deletePreviousLocalAvatar(String currentProfilePhotoUrl, Path avatarDirectory) {
        if (!StringUtils.hasText(currentProfilePhotoUrl) || !currentProfilePhotoUrl.startsWith("/api/users/avatars/")) {
            return;
        }

        String oldFilename = currentProfilePhotoUrl.substring("/api/users/avatars/".length());
        try {
            Path oldPath = avatarDirectory.resolve(sanitizeFilename(oldFilename)).normalize();
            if (oldPath.startsWith(avatarDirectory)) {
                Files.deleteIfExists(oldPath);
            }
        } catch (IOException | IllegalArgumentException ex) {
            log.debug("Unable to delete previous avatar {}: {}", currentProfilePhotoUrl, ex.getMessage());
        }
    }
}
