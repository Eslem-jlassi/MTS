package com.billcom.mts.dto.user;

import com.billcom.mts.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * User update request DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {

    @Email(message = "Invalid email format")
    @Size(max = 100)
    private String email;

    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;

    @Size(max = 50)
    private String firstName;

    @Size(max = 50)
    private String lastName;

    @Size(max = 20)
    private String phone;

    @Size(max = 255)
    private String profilePhotoUrl;

    /**
     * Role can only be changed by ADMIN.
     */
    private UserRole role;

    /**
     * Active status can only be changed by ADMIN.
     */
    private Boolean isActive;

    // ========== Client-specific fields ==========
    
    @Size(max = 100)
    private String companyName;

    private String address;
}
