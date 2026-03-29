export function getPasswordValidationError(password: string): string | null {
  if (!password || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caracteres.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }

  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }

  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  return null;
}

export function getPasswordConfirmationError(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) {
    return "Veuillez confirmer le mot de passe.";
  }

  if (password !== confirmation) {
    return "Les mots de passe ne correspondent pas.";
  }

  return null;
}
