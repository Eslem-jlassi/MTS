package com.billcom.mts.dto.user;

import com.billcom.mts.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * User response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private UserRole role;
    private String phone;
    private String profilePhotoUrl;
    private String oauthProvider;
    private Boolean emailVerified;
    private Boolean isActive;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ========== Client-specific fields ==========
    
    private Long clientId;
    private String clientCode;
    private String companyName;
}
