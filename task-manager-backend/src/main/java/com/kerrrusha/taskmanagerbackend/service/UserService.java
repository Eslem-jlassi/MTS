package com.kerrrusha.taskmanagerbackend.service;

import com.kerrrusha.taskmanagerbackend.dto.user.request.UserRegistrationRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.request.UserUpdateRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.response.UserResponseDto;

public interface UserService {

    UserResponseDto register(UserRegistrationRequestDto request);

    UserResponseDto findByEmail(String email);

    UserResponseDto update(UserUpdateRequestDto requestDto, String email);
}
