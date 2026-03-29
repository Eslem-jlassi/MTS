// =============================================================================
// MTS TELECOM - Profil utilisateur
// =============================================================================

import React, { useState } from "react";
import { User, Mail, Phone, KeyRound, Eye, EyeOff } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { Card, Button } from "../components/ui";
import { getErrorMessage } from "../api/client";
import { userService } from "../api/userService";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "../utils/passwordValidation";

const inputClass =
  "w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500";

export default function ProfilePage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (!changePwdForm.currentPassword.trim()) {
      setPwdMessage({ type: "error", text: "Le mot de passe actuel est obligatoire." });
      return;
    }

    const passwordError = getPasswordValidationError(changePwdForm.newPassword);
    if (passwordError) {
      setPwdMessage({ type: "error", text: passwordError });
      return;
    }

    const confirmationError = getPasswordConfirmationError(
      changePwdForm.newPassword,
      changePwdForm.confirmPassword,
    );
    if (confirmationError) {
      setPwdMessage({ type: "error", text: confirmationError });
      return;
    }

    setSubmitting(true);
    try {
      await userService.changePassword({
        currentPassword: changePwdForm.currentPassword,
        newPassword: changePwdForm.newPassword,
      });
      setPwdMessage({ type: "success", text: "Votre mot de passe a ete mis a jour." });
      setChangePwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdMessage({
        type: "error",
        text: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-ds-primary">Mon profil</h1>

      <Card padding="md">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.fullName || "Avatar utilisateur"}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ds-primary">
              {user?.fullName || "Utilisateur"}
            </h2>
            <p className="text-ds-muted">{user?.email}</p>
            {user?.oauthProvider === "GOOGLE" && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Connecte via Google
              </span>
            )}
          </div>
        </div>
        <dl className="grid gap-3">
          <div className="flex items-center gap-3 text-ds-primary">
            <Mail className="w-5 h-5 text-ds-muted" />
            <span>{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="flex items-center gap-3 text-ds-primary">
              <Phone className="w-5 h-5 text-ds-muted" />
              <span>{user.phone}</span>
            </div>
          )}
        </dl>
      </Card>

      {user?.oauthProvider ? (
        <Card padding="md">
          <div className="flex items-center gap-3 text-ds-muted">
            <KeyRound className="w-5 h-5" />
            <p className="text-sm">
              Ce compte utilise {user.oauthProvider === "GOOGLE" ? "Google" : user.oauthProvider}.
              La gestion du mot de passe n'est pas necessaire depuis l'application.
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="md">
          <h3 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Changer le mot de passe
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Mot de passe actuel *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  required
                  value={changePwdForm.currentPassword}
                  onChange={(e) =>
                    setChangePwdForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted"
                >
                  {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Nouveau mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  required
                  value={changePwdForm.newPassword}
                  onChange={(e) =>
                    setChangePwdForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Minimum 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted"
                >
                  {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">
                Confirmation du mot de passe *
              </label>
              <input
                type="password"
                required
                value={changePwdForm.confirmPassword}
                onChange={(e) =>
                  setChangePwdForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            {pwdMessage && (
              <p
                className={`text-sm ${
                  pwdMessage.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {pwdMessage.text}
              </p>
            )}

            <Button type="submit" variant="primary" loading={submitting}>
              Mettre a jour le mot de passe
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
