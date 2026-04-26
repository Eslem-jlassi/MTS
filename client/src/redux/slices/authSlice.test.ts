import reducer, { fetchCurrentUser } from "./authSlice";

describe("authSlice fetchCurrentUser rejection handling", () => {
  it("preserves the current session when fetchCurrentUser fails with a non-auth error", () => {
    const previousState = {
      user: {
        id: 1,
        email: "client@test.tn",
        firstName: "Client",
        lastName: "Test",
        fullName: "Client Test",
        role: "CLIENT",
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        emailVerified: true,
      },
      token: "access-token",
      isAuthenticated: true,
      isInitialized: false,
      isLoading: true,
      error: null,
    };

    const action = {
      type: fetchCurrentUser.rejected.type,
      payload: {
        message: "Requete invalide",
        shouldClearSession: false,
      },
    };

    const nextState = reducer(previousState as any, action as any);

    expect(nextState.user).toEqual(previousState.user);
    expect(nextState.token).toBe("access-token");
    expect(nextState.isAuthenticated).toBe(true);
    expect(nextState.isInitialized).toBe(true);
  });

  it("clears the session only when fetchCurrentUser fails with a 401-equivalent auth error", () => {
    const previousState = {
      user: {
        id: 1,
        email: "client@test.tn",
        firstName: "Client",
        lastName: "Test",
        fullName: "Client Test",
        role: "CLIENT",
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        emailVerified: true,
      },
      token: "expired-access-token",
      isAuthenticated: true,
      isInitialized: false,
      isLoading: true,
      error: null,
    };

    const action = {
      type: fetchCurrentUser.rejected.type,
      payload: {
        message: "Authentification invalide",
        shouldClearSession: true,
      },
    };

    const nextState = reducer(previousState as any, action as any);

    expect(nextState.user).toBeNull();
    expect(nextState.token).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
    expect(nextState.isInitialized).toBe(true);
  });
});
