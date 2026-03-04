// =============================================================================
// MTS TELECOM - Settings Page Entreprise (4 sections)
// Sections: Profil, Préférences, Notifications, Sécurité
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Sun,
  Moon,
  Globe,
  Bell,
  Shield,
  Save,
  Upload,
  Phone,
  Mail,
  Key,
  Monitor,
  Clock,
  Check,
} from "lucide-react";
import { Card, Button, Tabs, Input } from "../components/ui";
import type { Tab } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { userService } from "../api/userService";
import type { User } from "../types";
import { getErrorMessage } from "../api/client";

// =============================================================================
// TYPES
// =============================================================================

interface ProfileForm {
  fullName: string;
  phone: string;
  supportSignature: string;
}

interface PreferencesForm {
  language: "fr" | "en";
  theme: "light" | "dark";
  timezone: string;
}

interface NotificationPrefs {
  emailTicketAssigned: boolean;
  emailTicketEscalation: boolean;
  emailSlaWarning: boolean;
  emailIncident: boolean;
  emailReport: boolean;
  pushTicketAssigned: boolean;
  pushTicketEscalation: boolean;
  pushSlaWarning: boolean;
  pushIncident: boolean;
  pushReport: boolean;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

/**
 * SettingsPage - Page de paramètres utilisateur professionnelle.
 *
 * 4 SECTIONS :
 * 1. Profil : avatar, nom, téléphone, signature support (selon rôle)
 * 2. Préférences : langue, thème, fuseau horaire
 * 3. Notifications : granularité email/push par type d'événement
 * 4. Sécurité : changement mot de passe, sessions actives (mock)
 *
 * FONCTIONNALITÉS :
 * - Save states par section (bouton Sauvegarder + toasts)
 * - Validation formulaire propre
 * - Chargement des données utilisateur au mount
 * - Avatar upload placeholder
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState("profile");

  // ---- Profil ----
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: "",
    phone: "",
    supportSignature: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // ---- Préférences ----
  const [prefsForm, setPrefsForm] = useState<PreferencesForm>({
    language: "fr",
    theme: "light",
    timezone: "Europe/Paris",
  });
  const [prefsSaving, setPrefsSaving] = useState(false);

  // ---- Notifications ----
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    emailTicketAssigned: true,
    emailTicketEscalation: true,
    emailSlaWarning: true,
    emailIncident: true,
    emailReport: false,
    pushTicketAssigned: true,
    pushTicketEscalation: true,
    pushSlaWarning: true,
    pushIncident: true,
    pushReport: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // ---- Sécurité ----
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ==========================================================================
  // CHARGEMENT INITIAL
  // ==========================================================================

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await userService.getProfile();
      setCurrentUser(user);
      setProfileForm({
        fullName: user.fullName || "",
        phone: user.phone || "",
        supportSignature: user.supportSignature || "",
      });
      setPrefsForm({
        language: (user.preferredLanguage as "fr" | "en") || "fr",
        theme: theme,
        timezone: "Europe/Paris",
      });
    } catch (error) {
      addToast("error", getErrorMessage(error));
    }
  };

  // ==========================================================================
  // HANDLERS PROFIL
  // ==========================================================================

  const handleProfileSave = async () => {
    if (!profileForm.fullName.trim()) {
      addToast("warning", "Le nom complet est requis");
      return;
    }
    setProfileSaving(true);
    try {
      await userService.updateProfile({
        fullName: profileForm.fullName,
        phone: profileForm.phone || undefined,
        supportSignature: profileForm.supportSignature || undefined,
      });
      addToast("success", "Profil mis à jour avec succès");
      loadUserData();
    } catch (error) {
      addToast("error", getErrorMessage(error));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = () => {
    addToast("info", "Upload avatar – fonctionnalité à venir");
  };

  // ==========================================================================
  // HANDLERS PRÉFÉRENCES
  // ==========================================================================

  const handlePrefsSave = async () => {
    setPrefsSaving(true);
    try {
      // Update theme localement
      if (prefsForm.theme !== theme) {
        setTheme(prefsForm.theme);
      }
      // Update backend preferences
      await userService.updateProfile({
        preferredLanguage: prefsForm.language,
      });
      addToast("success", "Préférences sauvegardées");
    } catch (error) {
      addToast("error", getErrorMessage(error));
    } finally {
      setPrefsSaving(false);
    }
  };

  // ==========================================================================
  // HANDLERS NOTIFICATIONS
  // ==========================================================================

  const handleNotifSave = async () => {
    setNotifSaving(true);
    try {
      await userService.updateNotificationPreferences(
        notifPrefs as unknown as Record<string, boolean>,
      );
      addToast("success", "Préférences de notification sauvegardées");
    } catch (error) {
      addToast("error", getErrorMessage(error));
    } finally {
      setNotifSaving(false);
    }
  };

  // ==========================================================================
  // HANDLERS SÉCURITÉ
  // ==========================================================================

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      addToast("warning", "Tous les champs sont requis");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast("warning", "Les mots de passe ne correspondent pas");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      addToast("warning", "Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setPasswordSaving(true);
    try {
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      addToast("success", "Mot de passe modifié avec succès");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      addToast("error", getErrorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  };

  // ==========================================================================
  // TABS CONFIGURATION
  // ==========================================================================

  const tabs: Tab[] = [
    { key: "profile", label: "Profil", icon: <UserIcon size={18} /> },
    { key: "preferences", label: "Préférences", icon: <Globe size={18} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { key: "security", label: "Sécurité", icon: <Shield size={18} /> },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ds-primary">Paramètres</h1>
        <p className="text-ds-muted mt-1">
          Gérez votre profil, vos préférences et la sécurité de votre compte
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {/* SECTION 1 : PROFIL */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Informations personnelles
            </h2>
            <div className="space-y-6">
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-2">
                  Photo de profil
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profileForm.fullName.charAt(0).toUpperCase() || "U"}
                  </div>
                  <Button
                    variant="outline"
                    icon={<Upload size={18} />}
                    onClick={handleAvatarUpload}
                  >
                    Changer l'avatar
                  </Button>
                </div>
              </div>

              {/* Nom complet */}
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">
                  Nom complet *
                </label>
                <Input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Jean Dupont"
                  icon={<UserIcon size={18} />}
                />
              </div>

              {/* Email (lecture seule) */}
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">
                  Adresse email
                </label>
                <Input
                  type="email"
                  value={currentUser?.email || ""}
                  disabled
                  icon={<Mail size={18} />}
                />
                <p className="text-xs text-ds-muted mt-1">
                  L'email ne peut pas être modifié. Contactez un administrateur si nécessaire.
                </p>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Téléphone</label>
                <Input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX"
                  icon={<Phone size={18} />}
                />
              </div>

              {/* Signature support (pour AGENT/MANAGER/ADMIN) */}
              {currentUser && ["AGENT", "MANAGER", "ADMIN"].includes(currentUser.role) && (
                <div>
                  <label className="block text-sm font-medium text-ds-primary mb-1">
                    Signature support
                  </label>
                  <textarea
                    value={profileForm.supportSignature}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, supportSignature: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
                    placeholder="Cordialement,&#10;Jean Dupont&#10;Agent Support - MTS Telecom"
                  />
                  <p className="text-xs text-ds-muted mt-1">
                    Cette signature sera ajoutée automatiquement à vos réponses tickets.
                  </p>
                </div>
              )}

              {/* Action */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  icon={<Save size={18} />}
                  onClick={handleProfileSave}
                  loading={profileSaving}
                >
                  Sauvegarder le profil
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2 : PRÉFÉRENCES */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          {/* Apparence */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              {prefsForm.theme === "dark" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
              Apparence
            </h2>
            <p className="text-sm text-ds-secondary mb-4">
              Choisissez le thème d'affichage de l'interface.
            </p>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                  prefsForm.theme === "light"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "border-ds-border bg-ds-card text-ds-secondary hover:border-ds-muted"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={prefsForm.theme === "light"}
                  onChange={() => setPrefsForm((f) => ({ ...f, theme: "light" }))}
                  className="sr-only"
                />
                <Sun size={20} />
                <span className="font-medium">Clair</span>
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                  prefsForm.theme === "dark"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "border-ds-border bg-ds-card text-ds-secondary hover:border-ds-muted"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={prefsForm.theme === "dark"}
                  onChange={() => setPrefsForm((f) => ({ ...f, theme: "dark" }))}
                  className="sr-only"
                />
                <Moon size={20} />
                <span className="font-medium">Sombre</span>
              </label>
            </div>
          </Card>

          {/* Langue */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Langue
            </h2>
            <p className="text-sm text-ds-secondary mb-4">Langue de l'interface utilisateur.</p>
            <select
              value={prefsForm.language}
              onChange={(e) =>
                setPrefsForm((f) => ({ ...f, language: e.target.value as "fr" | "en" }))
              }
              className="w-full max-w-xs px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Card>

          {/* Fuseau horaire */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Fuseau horaire
            </h2>
            <p className="text-sm text-ds-secondary mb-4">
              Fuseau horaire pour l'affichage des dates et heures.
            </p>
            <select
              value={prefsForm.timezone}
              onChange={(e) => setPrefsForm((f) => ({ ...f, timezone: e.target.value }))}
              className="w-full max-w-xs px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="Africa/Tunis">Africa/Tunis (GMT+1)</option>
              <option value="UTC">UTC (GMT+0)</option>
            </select>
          </Card>

          {/* Action */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Save size={18} />}
              onClick={handlePrefsSave}
              loading={prefsSaving}
            >
              Sauvegarder les préférences
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 3 : NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Préférences de notification
            </h2>
            <p className="text-sm text-ds-secondary mb-6">
              Choisissez comment vous souhaitez recevoir les notifications pour chaque type
              d'événement.
            </p>

            <div className="space-y-6">
              {/* Email */}
              <div>
                <h3 className="text-sm font-semibold text-ds-primary mb-3 flex items-center gap-2">
                  <Mail size={16} />
                  Notifications par email
                </h3>
                <div className="space-y-2 pl-6">
                  <NotifCheckbox
                    label="Ticket assigné"
                    checked={notifPrefs.emailTicketAssigned}
                    onChange={(checked) =>
                      setNotifPrefs((p) => ({ ...p, emailTicketAssigned: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Ticket escaladé"
                    checked={notifPrefs.emailTicketEscalation}
                    onChange={(checked) =>
                      setNotifPrefs((p) => ({ ...p, emailTicketEscalation: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="SLA à risque"
                    checked={notifPrefs.emailSlaWarning}
                    onChange={(checked) =>
                      setNotifPrefs((p) => ({ ...p, emailSlaWarning: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Incident déclaré"
                    checked={notifPrefs.emailIncident}
                    onChange={(checked) => setNotifPrefs((p) => ({ ...p, emailIncident: checked }))}
                  />
                  <NotifCheckbox
                    label="Rapport généré"
                    checked={notifPrefs.emailReport}
                    onChange={(checked) => setNotifPrefs((p) => ({ ...p, emailReport: checked }))}
                  />
                </div>
              </div>

              {/* Push */}
              <div>
                <h3 className="text-sm font-semibold text-ds-primary mb-3 flex items-center gap-2">
                  <Monitor size={16} />
                  Notifications push (navigateur)
                </h3>
                <div className="space-y-2 pl-6">
                  <NotifCheckbox
                    label="Ticket assigné"
                    checked={notifPrefs.pushTicketAssigned}
                    onChange={(checked) =>
                      setNotifPrefs((p) => ({ ...p, pushTicketAssigned: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Ticket escaladé"
                    checked={notifPrefs.pushTicketEscalation}
                    onChange={(checked) =>
                      setNotifPrefs((p) => ({ ...p, pushTicketEscalation: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="SLA à risque"
                    checked={notifPrefs.pushSlaWarning}
                    onChange={(checked) =>
                      setNotifPrefs((p) => ({ ...p, pushSlaWarning: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Incident déclaré"
                    checked={notifPrefs.pushIncident}
                    onChange={(checked) => setNotifPrefs((p) => ({ ...p, pushIncident: checked }))}
                  />
                  <NotifCheckbox
                    label="Rapport généré"
                    checked={notifPrefs.pushReport}
                    onChange={(checked) => setNotifPrefs((p) => ({ ...p, pushReport: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end pt-6">
              <Button
                variant="primary"
                icon={<Save size={18} />}
                onClick={handleNotifSave}
                loading={notifSaving}
              >
                Sauvegarder les notifications
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 4 : SÉCURITÉ */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Changement mot de passe */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Changer le mot de passe
            </h2>
            <div className="space-y-4">
              <Input
                type="password"
                label="Mot de passe actuel"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
                placeholder="••••••••"
              />
              <Input
                type="password"
                label="Nouveau mot de passe"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="••••••••"
              />
              <Input
                type="password"
                label="Confirmer le mot de passe"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                placeholder="••••••••"
              />
              <p className="text-xs text-ds-muted">
                Le mot de passe doit contenir au moins 8 caractères.
              </p>
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  icon={<Key size={18} />}
                  onClick={handlePasswordChange}
                  loading={passwordSaving}
                >
                  Modifier le mot de passe
                </Button>
              </div>
            </div>
          </Card>

          {/* Session actuelle (dérivée du navigateur) */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Session actuelle
            </h2>
            <p className="text-sm text-ds-secondary mb-4">Votre session connectée actuellement.</p>
            <div className="flex items-center justify-between p-3 border border-ds-border rounded-lg bg-ds-elevated">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div>
                  <p className="text-sm font-medium text-ds-primary flex items-center gap-2">
                    {navigator.platform} -{" "}
                    {/Firefox/.test(navigator.userAgent)
                      ? "Firefox"
                      : /Edg/.test(navigator.userAgent)
                        ? "Edge"
                        : /Chrome/.test(navigator.userAgent)
                          ? "Chrome"
                          : /Safari/.test(navigator.userAgent)
                            ? "Safari"
                            : "Navigateur"}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                      <Check size={12} />
                      Actuelle
                    </span>
                  </p>
                  <p className="text-xs text-ds-muted">Connecté maintenant</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function NotifCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-ds-border text-primary-600 focus:ring-primary-500"
      />
      <span className="text-sm text-ds-primary">{label}</span>
    </label>
  );
}
