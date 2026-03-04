package com.billcom.mts.service;

import com.billcom.mts.dto.user.UserResponse;
import com.billcom.mts.dto.user.UserUpdateRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for user management.
 */
public interface UserService {

    /**
     * Get user by ID.
     */
    UserResponse getUserById(Long id);

    /**
     * Get user entity by ID.
     */
    User getUserEntityById(Long id);

    /**
     * Get user by email.
     */
    UserResponse getUserByEmail(String email);

    /**
     * Update user profile.
     */
    UserResponse updateUser(Long id, UserUpdateRequest request);

    /**
     * Update user role (admin only).
     */
    UserResponse updateUserRole(Long userId, UserRole role);

    /**
     * Deactivate user account.
     */
    void deactivateUser(Long userId);

    /**
     * Activate user account.
     */
    void activateUser(Long userId);

    /**
     * Get all users with pagination.
     */
    Page<UserResponse> getAllUsers(Pageable pageable);

    /**
     * Get users by role.
     */
    List<UserResponse> getUsersByRole(UserRole role);

    /**
     * Get all available agents for ticket assignment.
     */
    List<UserResponse> getAvailableAgents();

    /**
     * Count total users (for Admin dashboard KPI).
     */
    long count();

    /**
     * Update notification preferences (JSON).
     */
    void updateNotificationPreferences(Long userId, java.util.Map<String, Object> preferences);

    /**
     * Get notification preferences (JSON string).
     */
    String getNotificationPreferences(Long userId);
}
