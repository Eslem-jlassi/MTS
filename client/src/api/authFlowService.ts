// =============================================================================
// MTS TELECOM - Auth Flow Service (password reset, email verification)
// =============================================================================
// Encapsulates API calls for secondary auth endpoints:
// forgot-password, reset-password, verify-email, resend-verification.
// All calls go through the real Spring Boot backend.
// =============================================================================

import api from "./client";

export const authFlowService = {
  /**
   * Sends a password reset email.
   * Backend returns 200 even if email doesn't exist (security best practice).
   */
  forgotPassword: async (email: string): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>("/auth/forgot-password", { email });
    return response.data;
  },

  /**
   * Resets password using a one-time token.
   * Backend validates token existence and expiry.
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>("/auth/reset-password", {
      token,
      newPassword,
    });
    return response.data;
  },

  /**
   * Resends the email verification link.
   */
  resendVerificationEmail: async (email: string): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>("/auth/resend-verification", { email });
    return response.data;
  },

  /**
   * Verifies user email with a token.
   */
  verifyEmail: async (token: string): Promise<{ success: boolean }> => {
    const response = await api.get<{ success: boolean }>("/auth/verify-email", {
      params: { token },
    });
    return response.data;
  },
};

export default authFlowService;
