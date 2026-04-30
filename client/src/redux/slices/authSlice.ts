import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { authService } from "../../api";
import { getErrorMessage } from "../../api/client";
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from "../../types";
import { RootState } from "../store";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthThunkError {
  message: string;
  shouldClearSession: boolean;
}

const initialUser = authService.getStoredUser();
const initialToken = authService.getToken();

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: initialUser !== null || initialToken !== null,
  isInitialized: false,
  isLoading: false,
  error: null,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const normalizedMessage = getErrorMessage(error);
  if (!normalizedMessage || normalizedMessage === "Une erreur inattendue est survenue") {
    return fallback;
  }
  return normalizedMessage;
}

function shouldAuthenticate(response: AuthResponse): boolean {
  return (
    response.status !== "PENDING_EMAIL_VERIFICATION" &&
    !response.emailVerificationRequired &&
    response.user.emailVerified !== false
  );
}

export const login = createAsyncThunk<AuthResponse, LoginRequest, { rejectValue: string }>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec de connexion"));
    }
  },
);

export const register = createAsyncThunk<AuthResponse, RegisterRequest, { rejectValue: string }>(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      return await authService.register(userData);
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec d'inscription"));
    }
  },
);

export const googleLogin = createAsyncThunk<AuthResponse, string, { rejectValue: string }>(
  "auth/googleLogin",
  async (googleToken, { rejectWithValue }) => {
    try {
      return await authService.googleLogin(googleToken);
    } catch (error: unknown) {
      return rejectWithValue(extractErrorMessage(error, "Échec de connexion Google"));
    }
  },
);

export const fetchCurrentUser = createAsyncThunk<
  UserResponse,
  void,
  { rejectValue: AuthThunkError }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    return await authService.getCurrentUser();
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const shouldClearSession = status === 401;

    if (shouldClearSession) {
      authService.clearLocalSession();
    }

    return rejectWithValue({
      message: extractErrorMessage(error, "Aucune session active"),
      shouldClearSession,
    });
  }
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
    },
    sessionExpired: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<UserResponse>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      const authenticated = shouldAuthenticate(action.payload);
      state.isLoading = false;
      state.user = authenticated ? action.payload.user : null;
      state.token = authenticated ? (action.payload.accessToken ?? null) : null;
      state.isAuthenticated = authenticated;
      state.isInitialized = true;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload || "Erreur de connexion";
    });

    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      const authenticated = shouldAuthenticate(action.payload);
      state.isLoading = false;
      state.user = authenticated ? action.payload.user : null;
      state.token = authenticated ? (action.payload.accessToken ?? null) : null;
      state.isAuthenticated = authenticated;
      state.isInitialized = true;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload || "Erreur d'inscription";
    });

    builder.addCase(googleLogin.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(googleLogin.fulfilled, (state, action) => {
      const authenticated = shouldAuthenticate(action.payload);
      state.isLoading = false;
      state.user = authenticated ? action.payload.user : null;
      state.token = authenticated ? (action.payload.accessToken ?? null) : null;
      state.isAuthenticated = authenticated;
      state.isInitialized = true;
    });
    builder.addCase(googleLogin.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload || "Erreur de connexion Google";
    });

    builder.addCase(fetchCurrentUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.error = null;
    });
    builder.addCase(fetchCurrentUser.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = null;

      const shouldClearSession = action.payload?.shouldClearSession === true;
      if (shouldClearSession || (!state.user && !state.token)) {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        return;
      }

      state.isAuthenticated = true;
    });
  },
});

export const { logout, sessionExpired, clearError, setUser } = authSlice.actions;

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsAuthInitialized = (state: RootState) => state.auth.isInitialized;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

export default authSlice.reducer;
