import { evaluateGoogleOAuthAvailability } from "./googleOAuthConfig";

describe("evaluateGoogleOAuthAvailability", () => {
  it("active Google OAuth quand le flag, le client id et l'origine sont valides", () => {
    const availability = evaluateGoogleOAuthAvailability({
      enabledFlag: true,
      clientId: "client-id.apps.googleusercontent.com",
      allowedOrigins: ["http://localhost:3000"],
      currentOrigin: "http://localhost:3000",
    });

    expect(availability.isEnabled).toBe(true);
    expect(availability.reason).toBe("enabled");
  });

  it("explique clairement quand le flag frontend desactive Google OAuth", () => {
    const availability = evaluateGoogleOAuthAvailability({
      enabledFlag: false,
      clientId: "client-id.apps.googleusercontent.com",
      allowedOrigins: ["http://localhost:3000"],
      currentOrigin: "http://localhost:3000",
    });

    expect(availability.isEnabled).toBe(false);
    expect(availability.reason).toBe("disabled");
    expect(availability.message).toMatch(/desactivee/i);
  });

  it("bloque proprement une origine locale non autorisee", () => {
    const availability = evaluateGoogleOAuthAvailability({
      enabledFlag: true,
      clientId: "client-id.apps.googleusercontent.com",
      allowedOrigins: ["http://localhost:3000"],
      currentOrigin: "http://localhost:3001",
    });

    expect(availability.isEnabled).toBe(false);
    expect(availability.reason).toBe("origin-not-allowed");
    expect(availability.message).toContain("http://localhost:3001");
  });
});
