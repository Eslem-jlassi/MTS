// =============================================================================
// MTS TELECOM - User Service
// =============================================================================

import api from "./client";
import { UserResponse, PageResponse, PageRequest, UserRole } from "../types";

const USERS_PREFIX = "/users";

export const userService = {
  /**
   * Get all users (no pagination)
   */
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get<PageResponse<UserResponse>>(USERS_PREFIX, {
      params: { size: 1000 }
    });
    return response.data.content;
  },

  /**
   * Get all users with optional pagination
   */
  getUsers: async (page?: PageRequest): Promise<PageResponse<UserResponse>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<UserResponse>>(USERS_PREFIX, { params });
    return response.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: number): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`${USERS_PREFIX}/${id}`);
    return response.data;
  },

  /**
   * Get users by role
   */
  getUsersByRole: async (role: UserRole): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>(`${USERS_PREFIX}/role/${role}`);
    return response.data;
  },

  /**
   * Get all agents (for assignment dropdown)
   */
  getAgents: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>(`${USERS_PREFIX}/role/AGENT`);
    return response.data;
  },

  /**
   * Update user by ID (Admin)
   */
  updateUser: async (
    id: number,
    data: { firstName?: string; lastName?: string; phone?: string }
  ): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`${USERS_PREFIX}/${id}`, data);
    return response.data;
  },

  /**
   * Change user role (Admin only)
   */
  changeRole: async (id: number, role: UserRole): Promise<UserResponse> => {
    const response = await api.patch<UserResponse>(`${USERS_PREFIX}/${id}/role`, { role });
    return response.data;
  },

  /**
   * Deactivate user (Admin only)
   */
  deactivateUser: async (id: number): Promise<void> => {
    await api.patch(`${USERS_PREFIX}/${id}/deactivate`);
  },

  /**
   * Activate user (Admin only)
   */
  activateUser: async (id: number): Promise<void> => {
    await api.patch(`${USERS_PREFIX}/${id}/activate`);
  },

  /**
   * Request password reset for user (Admin only). Backend sends email with reset link.
   * TODO BACKEND: POST /api/users/:id/reset-password (optionally body: { sendEmail: true })
   */
  resetPassword: async (id: number): Promise<void> => {
    await api.post(`${USERS_PREFIX}/${id}/reset-password`, {});
  },

  /**
   * Get current user profile (authenticated user)
   */
  getProfile: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>("/auth/me");
    return response.data;
  },

  /**
   * Update current user profile (authenticated user)
   * Accepts: fullName, phone, supportSignature, preferredLanguage
   */
  updateProfile: async (data: {
    fullName?: string;
    phone?: string;
    supportSignature?: string;
    preferredLanguage?: string;
  }): Promise<UserResponse> => {
    const response = await api.put<UserResponse>("/auth/me", data);
    return response.data;
  },

  /**
   * Change password for current user
   */
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await api.post("/auth/change-password", data);
  },

  /**
   * Update notification preferences for the current user.
   * POST /api/users/me/notification-preferences
   */
  updateNotificationPreferences: async (prefs: Record<string, boolean>): Promise<void> => {
    await api.post("/users/me/notification-preferences", prefs);
  },
};

export default userService;
