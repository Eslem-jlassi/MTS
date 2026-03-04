// =============================================================================
// MTS TELECOM - Profil utilisateur (infos + changement mot de passe)
// =============================================================================

import React, { useState } from "react";
import { User, Mail, Phone, KeyRound, Eye, EyeOff } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { Card, Button } from "../components/ui";
import api from "../api/client";

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
  const [pwdMessage, setPwdMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    if (changePwdForm.newPassword !== changePwdForm.confirmPassword) {
      setPwdMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (changePwdForm.newPassword.length < 8) {
      setPwdMessage({ type: "error", text: "Le nouveau mot de passe doit faire au moins 8 caractères." });
      return;
    }
    try {
      const res = await api.put("/users/me/change-password", changePwdForm);
      if (!res.data) {
        throw new Error("Erreur lors du changement de mot de passe.");
      }
      setPwdMessage({ type: "success", text: "Mot de passe mis à jour." });
      setChangePwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur inattendue." });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-ds-primary">Mon profil</h1>

      <Card padding="md">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt={`Photo de ${user.fullName}`} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ds-primary">{user?.fullName || "Utilisateur"}</h2>
            <p className="text-ds-muted">{user?.email}</p>
            {user?.oauthProvider === "GOOGLE" && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connecté via Google
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

      {/* Masquer le changement de mot de passe pour les comptes OAuth */}
      {user?.oauthProvider ? (
        <Card padding="md">
          <div className="flex items-center gap-3 text-ds-muted">
            <KeyRound className="w-5 h-5" />
            <p className="text-sm">
              Votre compte utilise l'authentification {user.oauthProvider === 'GOOGLE' ? 'Google' : user.oauthProvider}.
              Le mot de passe n'est pas requis.
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
            <label className="block text-sm font-medium text-ds-primary mb-1">Mot de passe actuel *</label>
            <div className="relative">
              <input
                type={showCurrentPwd ? "text" : "password"}
                required
                value={changePwdForm.currentPassword}
                onChange={(e) => setChangePwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className={inputClass}
              />
              <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted">
                {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Nouveau mot de passe *</label>
            <div className="relative">
              <input
                type={showNewPwd ? "text" : "password"}
                required
                minLength={8}
                value={changePwdForm.newPassword}
                onChange={(e) => setChangePwdForm((p) => ({ ...p, newPassword: e.target.value }))}
                className={inputClass}
                placeholder="Minimum 8 caractères"
              />
              <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted">
                {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Confirmer le mot de passe *</label>
            <input
              type="password"
              required
              value={changePwdForm.confirmPassword}
              onChange={(e) => setChangePwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              className={inputClass}
            />
          </div>
          {pwdMessage && (
            <p className={`text-sm ${pwdMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {pwdMessage.text}
            </p>
          )}
          <Button type="submit" variant="primary">Mettre à jour le mot de passe</Button>
        </form>
      </Card>
      )}
    </div>
  );
}
