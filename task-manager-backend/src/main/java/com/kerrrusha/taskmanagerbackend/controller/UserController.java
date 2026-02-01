package com.kerrrusha.taskmanagerbackend.controller;

import com.kerrrusha.taskmanagerbackend.domain.User;
import com.kerrrusha.taskmanagerbackend.dto.user.request.UserUpdateRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.response.UserResponseDto;
import com.kerrrusha.taskmanagerbackend.repository.UserRepository;
import com.kerrrusha.taskmanagerbackend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ADMIN')")
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @GetMapping("/info")
    public UserResponseDto getUserInfo(Principal principal) {
        String email = principal.getName();
        return userService.findByEmail(email);
    }

    @PostMapping("/update")
    public UserResponseDto updateUser(@RequestBody UserUpdateRequestDto requestDto, Principal principal) {
        String email = principal.getName();
        return userService.update(requestDto, email);
    }

    @ResponseStatus(HttpStatus.OK)
    @GetMapping("/authorized")
    public void isAuthorized() {}
}
