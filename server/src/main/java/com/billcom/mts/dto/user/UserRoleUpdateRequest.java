package com.billcom.mts.dto.user;

import com.billcom.mts.enums.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleUpdateRequest {

    @NotNull(message = "Le role est obligatoire")
    private UserRole role;
}
