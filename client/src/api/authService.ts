import api from "./client";
import { authStorage } from "./authStorage";
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse, UserRole } from "../types";

function normalizeUser(u: unknown): UserResponse {
  const raw = (u && typeof u === "object" ? u : {}) as Record<string, unknown>;
  const firstName = (raw.firstName as string) || "";
  const lastName = (raw.lastName as string) || "";
  const fullName =
    (raw.fullName as string) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Utilisateur";
  const roleRaw = raw.role as string | undefined;
  const roleStr = typeof roleRaw === "string" ? roleRaw.toUpperCase() : "";
  const role: UserRole =
    roleStr && Object.values(UserRole).includes(roleStr as UserRole)
      ? (roleStr as UserRole)
      : UserRole.CLIENT;

  return {
    ...(raw as unknown as UserResponse),
    firstName,
    lastName,
    fullName,
    role,
    emailVerified: raw.emailVerified !== false,
  } as UserResponse;
}

function shouldPersistBrowserSession(response: AuthResponse, user: UserResponse): boolean {
  if (response.emailVerificationRequired) {
    return false;
  }

  return user.emailVerified !== false;
}

function persistOrClearSession(response: AuthResponse, user: UserResponse): void {
  if (shouldPersistBrowserSession(response, user)) {
    authStorage.saveSession(response.accessToken ?? null, response.refreshToken ?? null, user);
    return;
  }

  authStorage.clearSession();
}

const AUTH_PREFIX = "/auth";

export const authService = {
  login: async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/login`, request);
    const user = normalizeUser(response.data.user);
    persistOrClearSession(response.data, user);
    return { ...response.data, user };
  },

  register: async (request: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/register`, request);
    const user = normalizeUser(response.data.user);
    persistOrClearSession(response.data, user);
    return { ...response.data, user };
  },

  logout: async (): Promise<void> => {
    try {
      await api.post(`${AUTH_PREFIX}/logout`);
    } catch {
      // Session navigateur déjà invalide ou backend indisponible.
    } finally {
      authStorage.clearSession();
    }
  },

  clearLocalSession: (): void => {
    authStorage.clearSession();
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`${AUTH_PREFIX}/me`);
    const user = normalizeUser(response.data);
    authStorage.updateStoredUser(user);
    return user;
  },

  isLoggedIn: (): boolean => {
    return authStorage.getStoredUser() !== null || authStorage.getAccessToken() !== null;
  },

  getStoredUser: (): UserResponse | null => {
    const storedUser = authStorage.getStoredUser();
    if (storedUser) {
      return normalizeUser(storedUser);
    }
    return null;
  },

  getToken: (): string | null => {
    return authStorage.getAccessToken();
  },

  googleLogin: async (googleToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/google`, {
      token: googleToken,
    });
    const user = normalizeUser(response.data.user);
    persistOrClearSession(response.data, user);
    return { ...response.data, user };
  },
};

export default authService;
