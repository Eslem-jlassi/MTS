import { DEMO_MODE_ACTIVE } from "../demo/demoConfig";
import { UserResponse } from "../types";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

const parseStoredUser = (raw: string | null): UserResponse | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
};

export const authStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getStoredUser(): UserResponse | null {
    return parseStoredUser(localStorage.getItem(USER_KEY));
  },

  getStoredUserId(): string | null {
    const user = parseStoredUser(localStorage.getItem(USER_KEY));
    if (user?.id === undefined || user?.id === null) {
      return null;
    }
    return String(user.id);
  },

  saveTokens(accessToken?: string | null, refreshToken?: string | null): void {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else if (!DEMO_MODE_ACTIVE) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else if (!DEMO_MODE_ACTIVE) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  saveSession(
    accessToken: string | null | undefined,
    refreshToken: string | null | undefined,
    user: UserResponse,
  ): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.saveTokens(accessToken, refreshToken);
  },

  updateStoredUser(user: UserResponse): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
