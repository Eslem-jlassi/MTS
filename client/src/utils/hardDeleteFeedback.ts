import { getErrorMessage } from "../api/client";

type HardDeleteEntity = "ticket" | "incident" | "client" | "user";

const DEFAULT_FALLBACK: Record<HardDeleteEntity, string> = {
  ticket: "Suppression definitive impossible pour ce ticket.",
  incident: "Suppression definitive impossible pour cet incident.",
  client: "Suppression definitive impossible pour ce client.",
  user: "Suppression definitive impossible pour cet utilisateur.",
};

function isGenericHttpMessage(message: string): boolean {
  return [
    "Requete invalide. Verifiez les informations saisies.",
    "Authentification invalide ou expiree.",
    "Acces refuse pour cette operation.",
    "Ressource introuvable.",
    "Une erreur serveur est survenue. Reessayez dans quelques instants.",
    "Une erreur inattendue est survenue",
    "Erreur reseau. Verifiez votre connexion internet.",
    "Impossible de contacter le serveur. Verifiez votre connexion internet.",
    "Le service est temporairement indisponible. Reessayez dans quelques instants.",
  ].includes(message);
}

export function getAdminHardDeleteErrorMessage(
  entity: HardDeleteEntity,
  error: unknown,
  fallback?: string,
): string {
  const backendMessage = getErrorMessage(error);

  if (backendMessage && !isGenericHttpMessage(backendMessage)) {
    return backendMessage;
  }

  return fallback || DEFAULT_FALLBACK[entity];
}
