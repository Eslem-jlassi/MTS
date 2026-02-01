package com.kerrrusha.taskmanagerbackend.service.impl;

import com.kerrrusha.taskmanagerbackend.domain.User;
import com.kerrrusha.taskmanagerbackend.dto.user.request.UserRegistrationRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.request.UserUpdateRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.response.UserResponseDto;
import com.kerrrusha.taskmanagerbackend.mapper.UserMapper;
import com.kerrrusha.taskmanagerbackend.repository.UserRepository;
import com.kerrrusha.taskmanagerbackend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import static io.micrometer.common.util.StringUtils.isNotBlank;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    public UserResponseDto register(UserRegistrationRequestDto request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("User already exists with such email: " + request.getEmail());
        }

        User user = new User();
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setProfilePhotoUrl(request.getProfilePhotoUrl());
        User savedUser = userRepository.save(user);

        return userMapper.toDto(savedUser);
    }

    @Override
    public UserResponseDto findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found by email: " + email));
        return userMapper.toDto(user);
    }

    @Override
    public UserResponseDto update(UserUpdateRequestDto requestDto, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found by email: " + email));
        if (!user.getId().equals(requestDto.userId())) {
            throw new RuntimeException("User id in request and in database are different");
        }
        if (isNotBlank(requestDto.firstName())) {
            user.setFirstName(requestDto.firstName());
        }
        if (isNotBlank(requestDto.lastName())) {
            user.setLastName(requestDto.lastName());
        }
        return userMapper.toDto(userRepository.save(user));
    }
}
