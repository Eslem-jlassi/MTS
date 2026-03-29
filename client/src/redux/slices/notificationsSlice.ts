// =============================================================================
// MTS TELECOM - Notifications Redux Slice
// =============================================================================
/**
 * Gère l'état des notifications: liste, compteur non lus, et réception temps réel (WebSocket).
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { notificationService } from "../../api";
import type { Notification } from "../../types";

interface NotificationsState {
  /** Liste des notifications (dropdown, dernières) */
  list: Notification[];
  /** Compteur de non lues (badge cloche) */
  unreadCount: number;
  isLoading: boolean;
  isLoadingCount: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  list: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingCount: false,
  error: null,
};

// =============================================================================
// ASYNC THUNKS
// =============================================================================

export const fetchUnreadNotifications = createAsyncThunk<
  Notification[],
  void,
  { rejectValue: string }
>("notifications/fetchUnread", async (_, { rejectWithValue }) => {
  try {
    return await notificationService.getUnread();
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur chargement notifications",
    );
  }
});

export const fetchUnreadCount = createAsyncThunk<number, void, { rejectValue: string }>(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      return await notificationService.getUnreadCount();
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Erreur compteur",
      );
    }
  },
);

export const markNotificationAsRead = createAsyncThunk<number, number, { rejectValue: string }>(
  "notifications/markAsRead",
  async (id, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(id);
      return id;
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur",
      );
    }
  },
);

export const markAllNotificationsAsRead = createAsyncThunk<number, void, { rejectValue: string }>(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      const { markedCount } = await notificationService.markAllAsRead();
      return markedCount;
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur",
      );
    }
  },
);

// =============================================================================
// SLICE
// =============================================================================

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /** Ajoute une notification reçue par WebSocket (en tête de liste, incrémente le compteur). */
    pushNotification(state, action: PayloadAction<Notification>) {
      const n = action.payload;
      const exists = state.list.some((x) => x.id === n.id);
      if (!exists) {
        state.list = [n, ...state.list].slice(0, 50);
        if (!n.isRead) state.unreadCount = Math.max(0, state.unreadCount) + 1;
      }
    },
    /** Met à jour le compteur (après fetch count). */
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchUnreadNotifications
    builder.addCase(fetchUnreadNotifications.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUnreadNotifications.fulfilled, (state, action) => {
      state.isLoading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchUnreadNotifications.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload ?? "Erreur";
    });

    // fetchUnreadCount
    builder.addCase(fetchUnreadCount.pending, (state) => {
      state.isLoadingCount = true;
    });
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.isLoadingCount = false;
      state.unreadCount = action.payload;
    });
    builder.addCase(fetchUnreadCount.rejected, (state) => {
      state.isLoadingCount = false;
    });

    // markAsRead
    builder.addCase(markNotificationAsRead.fulfilled, (state, action) => {
      const id = action.payload;
      const item = state.list.find((n) => n.id === id);
      if (item) {
        item.isRead = true;
        item.readAt = new Date().toISOString();
      }
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    });

    // markAllAsRead
    builder.addCase(markAllNotificationsAsRead.fulfilled, (state, action) => {
      const count = action.payload;
      state.list.forEach((n) => {
        n.isRead = true;
        n.readAt = new Date().toISOString();
      });
      state.unreadCount = Math.max(0, state.unreadCount - count);
    });
  },
});

export const { pushNotification, setUnreadCount, clearError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
