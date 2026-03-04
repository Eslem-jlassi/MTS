// =============================================================================
// MTS TELECOM - Dashboard Redux Slice
// =============================================================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { dashboardService, DashboardFilters } from "../../api/dashboardService";
import { DashboardStats, AgentPerformance } from "../../types";

interface DashboardState {
  stats: DashboardStats | null;
  agentPerformance: AgentPerformance[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DashboardState = {
  stats: null,
  agentPerformance: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchDashboardStats = createAsyncThunk<
  DashboardStats,
  DashboardFilters | void,
  { rejectValue: string }
>(
  "dashboard/fetchStats",
  async (filters, { rejectWithValue }) => {
    try {
      return await dashboardService.getStats(filters || undefined);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Erreur de chargement des statistiques");
    }
  }
);

export const fetchAgentPerformance = createAsyncThunk<
  AgentPerformance[],
  void,
  { rejectValue: string }
>("dashboard/fetchAgentPerformance", async (_, { rejectWithValue }) => {
  try {
    return await dashboardService.getAgentPerformance();
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Erreur de chargement des performances"
    );
  }
});

// Slice
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch stats
    builder.addCase(fetchDashboardStats.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDashboardStats.fulfilled, (state, action) => {
      state.isLoading = false;
      state.stats = action.payload;
      state.lastUpdated = new Date().toISOString();
    });
    builder.addCase(fetchDashboardStats.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur";
    });

    // Fetch agent performance
    builder.addCase(fetchAgentPerformance.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchAgentPerformance.fulfilled, (state, action) => {
      state.isLoading = false;
      state.agentPerformance = action.payload;
    });
    builder.addCase(fetchAgentPerformance.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || "Erreur";
    });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
