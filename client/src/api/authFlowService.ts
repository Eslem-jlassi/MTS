// =============================================================================
// MTS TELECOM - Auth Flow Service (password reset, email verification)
// =============================================================================
// Encapsulates API calls for secondary auth endpoints:
// forgot-password, reset-password, verify-email, resend-verification.
// All calls go through the real Spring Boot backend.
// =============================================================================

import api from "./client";

interface AuthFlowResponse {
  success: boolean;
  message?: string;
  status?: string;
}

export const authFlowService = {
  /**
   * Sends a password reset email.
   * Backend returns 200 even if email doesn't exist (security best practice).
   */
  forgotPassword: async (email: string): Promise<AuthFlowResponse> => {
    const response = await api.post<AuthFlowResponse>("/auth/forgot-password", { email });
    return response.data;
  },

  /**
   * Resets password using a one-time token.
   * Backend validates token existence and expiry.
   */
  resetPassword: async (token: string, newPassword: string): Promise<AuthFlowResponse> => {
    const response = await api.post<AuthFlowResponse>("/auth/reset-password", {
      token,
      newPassword,
    });
    return response.data;
  },

  /**
   * Resends the email verification link.
   */
  resendVerificationEmail: async (email: string): Promise<AuthFlowResponse> => {
    const response = await api.post<AuthFlowResponse>("/auth/resend-verification", { email });
    return response.data;
  },

  /**
   * Verifies user email with a token.
   */
  verifyEmail: async (token: string, email?: string): Promise<AuthFlowResponse> => {
    const response = await api.get<AuthFlowResponse>("/auth/verify-email", {
      params: { token, email },
    });
    return response.data;
  },
};

export default authFlowService;
