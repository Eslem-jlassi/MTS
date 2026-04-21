import React from "react";
import { render, screen } from "@testing-library/react";
import GoogleAuthSection from "./GoogleAuthSection";
import api from "../../api/client";
import { googleOAuthConfig } from "../../config/googleOAuthConfig";

jest.mock("../../api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ text }: { text: string }) => <div data-testid="google-login-button">{text}</div>,
}));

jest.mock("../../config/googleOAuthConfig", () => ({
  googleOAuthConfig: {
    isEnabled: true,
    reason: "enabled",
    technicalHint: null,
  },
}));

type MutableGoogleOAuthConfig = {
  isEnabled: boolean;
  reason: string;
  message: string | null;
  technicalHint: string | null;
};

const mockedApi = api as jest.Mocked<typeof api>;
const mockedGoogleOAuthConfig = googleOAuthConfig as unknown as MutableGoogleOAuthConfig;

describe("GoogleAuthSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGoogleOAuthConfig.isEnabled = true;
    mockedGoogleOAuthConfig.reason = "enabled";
    mockedGoogleOAuthConfig.message = null;
    mockedGoogleOAuthConfig.technicalHint = null;
  });

  it("renders Google button when frontend and backend are configured", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        enabled: true,
        reason: "configured",
      },
    } as any);

    render(<GoogleAuthSection mode="signin" onSuccess={jest.fn()} onError={jest.fn()} />);

    expect(await screen.findByTestId("google-login-button")).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith("/auth/google/config", { timeout: 5000 });
  });

  it("shows configuration message when backend Google OAuth is missing", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        enabled: false,
        reason: "missing-client-id",
      },
    } as any);

    render(<GoogleAuthSection mode="signup" onSuccess={jest.fn()} onError={jest.fn()} />);

    expect(
      await screen.findByText("Connexion Google indisponible : configuration serveur manquante."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
  });

  it("shows temporary unavailable message when backend check fails", async () => {
    mockedApi.get.mockRejectedValueOnce(new Error("Network Error"));

    render(<GoogleAuthSection mode="signin" onSuccess={jest.fn()} onError={jest.fn()} />);

    expect(await screen.findByText("Connexion Google temporairement indisponible.")).toBeInTheDocument();
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
  });

  it("shows frontend fallback when Google OAuth is disabled on frontend", async () => {
    mockedGoogleOAuthConfig.isEnabled = false;
    mockedGoogleOAuthConfig.reason = "disabled";
    mockedGoogleOAuthConfig.message =
      "La connexion Google est desactivee pour cet environnement.";
    mockedGoogleOAuthConfig.technicalHint =
      "Definissez REACT_APP_GOOGLE_OAUTH_ENABLED=true puis redemarrez le frontend.";

    render(<GoogleAuthSection mode="signin" onSuccess={jest.fn()} onError={jest.fn()} />);

    expect(
      await screen.findByText("La connexion Google est desactivee pour cet environnement."),
    ).toBeInTheDocument();
    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
  });
});
