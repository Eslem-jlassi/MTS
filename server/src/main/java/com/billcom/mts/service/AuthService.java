package com.billcom.mts.service;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.dto.auth.LoginRequest;
import com.billcom.mts.dto.auth.RegisterRequest;

/**
 * Authentication service interface.
 */
public interface AuthService {

    /**
     * Authenticate user with email and password.
     */
    AuthResponse login(LoginRequest request, String clientIp);

    /**
     * Register a new user.
     * If role is not specified, defaults to CLIENT.
     */
    AuthResponse register(RegisterRequest request);

    /**
     * Register a new user by admin with specific role.
     */
    AuthResponse registerByAdmin(RegisterRequest request, Long adminId);

    /**
     * Refresh access token using refresh token.
     */
    AuthResponse refreshToken(String refreshToken, String clientIp);

    /**
     * Logout user (invalidate tokens if needed).
     */
    void logout(String token);

    /**
     * Authenticate or register user with Google ID token.
     * If the user does not exist, creates a new CLIENT account.
     */
    AuthResponse googleLogin(String idToken, String clientIp);

    /**
     * Request a password reset email.
     * Always returns success (security best practice — don't reveal if email exists).
     */
    void forgotPassword(String email);

    /**
     * Reset password using a one-time token.
     */
    void resetPassword(String token, String newPassword);

    /**
     * Verify user email using a verification token.
     */
    void verifyEmail(String token);

    /**
     * Resend verification email.
     */
    void resendVerificationEmail(String email);
}
