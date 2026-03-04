package com.billcom.mts.service.impl;

import com.billcom.mts.dto.user.UserResponse;
import com.billcom.mts.dto.user.UserUpdateRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * User service implementation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

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
            .profilePhotoUrl(user.getProfilePhotoUrl())
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
}
