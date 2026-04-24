// =============================================================================
// MTS TELECOM - User Service
// =============================================================================

import api from "./client";
import {
  AdminHardDeleteRequestPayload,
  CreateInternalUserRequest,
  NotificationPreferences,
  PageRequest,
  PageResponse,
  UserResponse,
  UserRole,
} from "../types";

const USERS_PREFIX = "/users";

export const userService = {
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get<PageResponse<UserResponse>>(USERS_PREFIX, {
      params: { size: 1000 },
    });
    return response.data.content;
  },

  getUsers: async (page?: PageRequest): Promise<PageResponse<UserResponse>> => {
    const params = new URLSearchParams();
    if (page) {
      if (page.page !== undefined) params.append("page", String(page.page));
      if (page.size !== undefined) params.append("size", String(page.size));
    }
    const response = await api.get<PageResponse<UserResponse>>(USERS_PREFIX, { params });
    return response.data;
  },

  getUserById: async (id: number): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`${USERS_PREFIX}/${id}`);
    return response.data;
  },

  getUsersByRole: async (role: UserRole): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>(`${USERS_PREFIX}/role/${role}`);
    return response.data;
  },

  getAgents: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>(`${USERS_PREFIX}/agents/available`);
    return response.data;
  },

  createInternalUser: async (data: CreateInternalUserRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>(`${USERS_PREFIX}/internal`, data);
    return response.data;
  },

  updateUser: async (
    id: number,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`${USERS_PREFIX}/${id}`, data);
    return response.data;
  },

  changeRole: async (id: number, role: UserRole): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`${USERS_PREFIX}/${id}/role`, { role });
    return response.data;
  },

  deactivateUser: async (id: number): Promise<void> => {
    await api.post(`${USERS_PREFIX}/${id}/deactivate`);
  },

  activateUser: async (id: number): Promise<void> => {
    await api.post(`${USERS_PREFIX}/${id}/activate`);
  },

  hardDeleteUser: async (id: number, payload: AdminHardDeleteRequestPayload): Promise<void> => {
    await api.delete(`${USERS_PREFIX}/${id}/hard-delete`, { data: payload });
  },

  requestHardDeleteChallenge: async (id: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `${USERS_PREFIX}/${id}/hard-delete/challenge`,
    );
    return response.data;
  },

  setPasswordByAdmin: async (id: number, newPassword: string): Promise<void> => {
    await api.put(`${USERS_PREFIX}/${id}/password`, { newPassword });
  },

  resetPassword: async (id: number): Promise<void> => {
    await api.post(`${USERS_PREFIX}/${id}/reset-password`, {});
  },

  getProfile: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>("/users/me");
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<UserResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<UserResponse>("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  },

  updateProfile: async (data: { fullName?: string; phone?: string }): Promise<UserResponse> => {
    const normalizedPayload: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    } = {
      phone: data.phone,
    };

    if (data.fullName && data.fullName.trim()) {
      const parts = data.fullName.trim().split(/\s+/);
      normalizedPayload.firstName = parts[0];
      normalizedPayload.lastName = parts.slice(1).join(" ") || "-";
    }

    const response = await api.put<UserResponse>("/users/me", normalizedPayload);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.put("/users/me/change-password", data);
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get<NotificationPreferences>("/users/me/notification-preferences");
    return response.data;
  },

  updateNotificationPreferences: async (prefs: NotificationPreferences): Promise<void> => {
    await api.post("/users/me/notification-preferences", prefs);
  },
};

export default userService;
