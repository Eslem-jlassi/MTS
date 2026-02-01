package com.kerrrusha.taskmanagerbackend.dto.user.request;

import jakarta.validation.constraints.NotBlank;

public record UserUpdateRequestDto(
        @NotBlank String userId,
        String firstName,
        String lastName
) {}
