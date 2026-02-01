package com.kerrrusha.taskmanagerbackend.dto.user.response;

public record UserResponseDto(
        String id,
        String email,
        String firstName,
        String lastName,
        String profilePhotoUrl) {
}
