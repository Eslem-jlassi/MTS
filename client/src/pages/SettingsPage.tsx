// =============================================================================
// MTS TELECOM - Settings Page
// =============================================================================

import React, { useRef, useState, useEffect, useCallback } from "react";
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
  Check,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { Card, Button, Tabs, Input } from "../components/ui";
import type { Tab } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { userService } from "../api/userService";
import { authStorage } from "../api/authStorage";
import { setUser } from "../redux/slices/authSlice";
import type { NotificationPreferences, User } from "../types";
import { getErrorMessage } from "../api/client";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "../utils/passwordValidation";

interface ProfileForm {
  fullName: string;
  phone: string;
}

interface PreferencesForm {
  language: "fr" | "en";
  theme: "light" | "dark";
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const defaultNotificationPrefs: NotificationPreferences = {
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
};

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("profile");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: "",
    phone: "",
  });
  const [prefsForm, setPrefsForm] = useState<PreferencesForm>({
    language,
    theme,
  });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(defaultNotificationPrefs);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const syncAuthenticatedUser = useCallback(
    (user: User) => {
      setCurrentUser(user);
      authStorage.updateStoredUser(user);
      dispatch(setUser(user));
    },
    [dispatch],
  );

  const loadUserData = useCallback(async () => {
    try {
      const [user, notificationPreferences] = await Promise.all([
        userService.getProfile(),
        userService.getNotificationPreferences().catch(() => defaultNotificationPrefs),
      ]);

      setCurrentUser(user);
      setProfileForm({
        fullName: user.fullName || "",
        phone: user.phone || "",
      });
      setPrefsForm({
        language,
        theme,
      });
      setNotifPrefs({
        ...defaultNotificationPrefs,
        ...notificationPreferences,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [language, theme, toast]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleProfileSave = async () => {
    if (!profileForm.fullName.trim()) {
      toast.addToast("warning", "Le nom complet est requis.");
      return;
    }

    setProfileSaving(true);
    try {
      const updatedUser = await userService.updateProfile({
        fullName: profileForm.fullName,
        phone: profileForm.phone || undefined,
      });
      syncAuthenticatedUser(updatedUser);
      toast.success("Profil mis a jour avec succes.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.addToast("warning", "Format invalide. Utilisez JPG, PNG, WEBP ou GIF.");
      e.target.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.addToast("warning", "La taille maximale de l'avatar est 5 MB.");
      e.target.value = "";
      return;
    }

    setAvatarUploading(true);
    try {
      const updatedUser = await userService.uploadAvatar(file);
      syncAuthenticatedUser(updatedUser);
      toast.success("Avatar mis a jour avec succes.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handlePrefsSave = async () => {
    setPrefsSaving(true);
    try {
      if (prefsForm.theme !== theme) {
        setTheme(prefsForm.theme);
      }
      if (prefsForm.language !== language) {
        setLanguage(prefsForm.language);
      }
      toast.success("Preferences enregistrees sur ce navigateur.");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleNotifSave = async () => {
    setNotifSaving(true);
    try {
      await userService.updateNotificationPreferences(notifPrefs);
      toast.success("Preferences de notification enregistrees.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setNotifSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword.trim()) {
      toast.addToast("warning", "Le mot de passe actuel est obligatoire.");
      return;
    }

    const passwordError = getPasswordValidationError(passwordForm.newPassword);
    if (passwordError) {
      toast.addToast("warning", passwordError);
      return;
    }

    const confirmationError = getPasswordConfirmationError(
      passwordForm.newPassword,
      passwordForm.confirmPassword,
    );
    if (confirmationError) {
      toast.addToast("warning", confirmationError);
      return;
    }

    setPasswordSaving(true);
    try {
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Mot de passe modifie avec succes.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  };

  const tabs: Tab[] = [
    { key: "profile", label: "Profil", icon: <UserIcon size={18} /> },
    { key: "preferences", label: "Preferences", icon: <Globe size={18} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { key: "security", label: "Securite", icon: <Shield size={18} /> },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-ds-primary">Parametres</h1>
        <p className="text-ds-muted mt-1">
          Gere votre profil, vos preferences locales et la securite de votre compte.
        </p>
      </div>

      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Informations personnelles
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-2">
                  Photo de profil
                </label>
                <div className="flex items-center gap-4">
                  {currentUser?.profilePhotoUrl ? (
                    <img
                      src={currentUser.profilePhotoUrl}
                      alt={profileForm.fullName || "Avatar"}
                      className="w-20 h-20 rounded-full object-cover border border-ds-border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                      {profileForm.fullName.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />

                  <Button
                    variant="outline"
                    icon={<Upload size={18} />}
                    onClick={handleAvatarUpload}
                    loading={avatarUploading}
                  >
                    Changer l'avatar
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">
                  Nom complet *
                </label>
                <Input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="Jean Dupont"
                  icon={<UserIcon size={18} />}
                />
              </div>

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
                  L'email ne peut pas etre modifie depuis cet ecran.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Telephone</label>
                <Input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX"
                  icon={<Phone size={18} />}
                />
              </div>

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

      {activeTab === "preferences" && (
        <div className="space-y-6">
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
              Ces preferences sont appliquees et conservees sur ce navigateur.
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
                  onChange={() => setPrefsForm((prev) => ({ ...prev, theme: "light" }))}
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
                  onChange={() => setPrefsForm((prev) => ({ ...prev, theme: "dark" }))}
                  className="sr-only"
                />
                <Moon size={20} />
                <span className="font-medium">Sombre</span>
              </label>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Langue
            </h2>
            <p className="text-sm text-ds-secondary mb-4">
              Langue de l'interface pour ce navigateur.
            </p>
            <select
              value={prefsForm.language}
              onChange={(e) =>
                setPrefsForm((prev) => ({ ...prev, language: e.target.value as "fr" | "en" }))
              }
              className="w-full max-w-xs px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
            </select>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Save size={18} />}
              onClick={handlePrefsSave}
              loading={prefsSaving}
            >
              Sauvegarder les preferences
            </Button>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Preferences de notification
            </h2>
            <p className="text-sm text-ds-secondary mb-6">
              Choisissez comment recevoir les notifications de support.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-ds-primary mb-3 flex items-center gap-2">
                  <Mail size={16} />
                  Notifications par email
                </h3>
                <div className="space-y-2 pl-6">
                  <NotifCheckbox
                    label="Ticket assigne"
                    checked={notifPrefs.emailTicketAssigned}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, emailTicketAssigned: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Ticket escalade"
                    checked={notifPrefs.emailTicketEscalation}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, emailTicketEscalation: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="SLA a risque"
                    checked={notifPrefs.emailSlaWarning}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, emailSlaWarning: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Incident declare"
                    checked={notifPrefs.emailIncident}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, emailIncident: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Rapport genere"
                    checked={notifPrefs.emailReport}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, emailReport: checked }))
                    }
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ds-primary mb-3 flex items-center gap-2">
                  <Monitor size={16} />
                  Notifications navigateur
                </h3>
                <div className="space-y-2 pl-6">
                  <NotifCheckbox
                    label="Ticket assigne"
                    checked={notifPrefs.pushTicketAssigned}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, pushTicketAssigned: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Ticket escalade"
                    checked={notifPrefs.pushTicketEscalation}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, pushTicketEscalation: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="SLA a risque"
                    checked={notifPrefs.pushSlaWarning}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, pushSlaWarning: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Incident declare"
                    checked={notifPrefs.pushIncident}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, pushIncident: checked }))
                    }
                  />
                  <NotifCheckbox
                    label="Rapport genere"
                    checked={notifPrefs.pushReport}
                    onChange={(checked) =>
                      setNotifPrefs((prev) => ({ ...prev, pushReport: checked }))
                    }
                  />
                </div>
              </div>
            </div>

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

      {activeTab === "security" && (
        <div className="space-y-6">
          {currentUser?.oauthProvider ? (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Authentification externe
              </h2>
              <p className="text-sm text-ds-secondary">
                Ce compte utilise {currentUser.oauthProvider}. La gestion du mot de passe se fait
                depuis ce fournisseur d'authentification.
              </p>
            </Card>
          ) : (
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
                    setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  placeholder="********"
                />
                <Input
                  type="password"
                  label="Nouveau mot de passe"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  placeholder="********"
                />
                <Input
                  type="password"
                  label="Confirmation du mot de passe"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="********"
                />
                <p className="text-xs text-ds-muted">
                  Minimum 8 caracteres, avec une majuscule, une minuscule et un chiffre.
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
          )}

          <Card padding="lg">
            <h2 className="text-lg font-semibold text-ds-primary mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Session actuelle
            </h2>
            <p className="text-sm text-ds-secondary mb-4">Session active sur ce navigateur.</p>
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
                  <p className="text-xs text-ds-muted">Connecte maintenant</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

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
