package com.kerrrusha.taskmanagerbackend.controller;

import com.google.common.net.HttpHeaders;
import com.kerrrusha.taskmanagerbackend.dto.auth.JwtAuthenticationResponse;
import com.kerrrusha.taskmanagerbackend.dto.user.request.UserLoginRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.request.UserRegistrationRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.user.response.UserResponseDto;
import com.kerrrusha.taskmanagerbackend.security.AuthenticationService;
import com.kerrrusha.taskmanagerbackend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import static com.kerrrusha.taskmanagerbackend.controller.OAuthController.AUTH_TOKEN;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Registration and authentication endpoints")
public class AuthController {

    private final UserService userService;
    private final AuthenticationService authenticationService;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public UserResponseDto register(@Valid @RequestBody UserRegistrationRequestDto request) {
        return userService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate a user")
    public JwtAuthenticationResponse login(@Valid @RequestBody UserLoginRequestDto request) {
        return authenticationService.authenticate(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.OK)
    public void performLogout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        final ResponseCookie cookie = ResponseCookie.from(AUTH_TOKEN, "")
                .httpOnly(true)
                .maxAge(0)
                .path("/")
                .secure(false)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        logoutHandler.logout(request, response, authentication);
    }
}
