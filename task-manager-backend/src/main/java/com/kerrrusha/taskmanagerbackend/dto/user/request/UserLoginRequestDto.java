package com.kerrrusha.taskmanagerbackend.dto.user.request;

import com.kerrrusha.taskmanagerbackend.validation.email.Email;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "User request for login")
public class UserLoginRequestDto {

    @Email
    @Schema(description = "User email", example = "example@gmail.com")
    private String email;

    @Schema(description = "Password", example = "my_1secret1_password")
    @Size(min = 3, max = 255, message = "Password should be at least 3 symbols length")
    private String password;
}
