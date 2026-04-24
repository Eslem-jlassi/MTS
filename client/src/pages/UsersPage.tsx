// =============================================================================
// MTS TELECOM - Users Management
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Search,
  Plus,
  Edit2,
  Shield,
  User as UserIcon,
  Users as UsersIcon,
  UserCog,
  Mail,
  Phone,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  KeyRound,
  Trash2,
} from "lucide-react";
import { userService } from "../api/userService";
import { getErrorMessage } from "../api/client";
import { RootState } from "../redux/store";
import { CreateInternalUserRequest, UserResponse, UserRole, RoleLabels } from "../types";
import { useToast } from "../context/ToastContext";
import {
  Card,
  Button,
  Badge,
  EmptyState,
  SkeletonTable,
  Modal,
  ConfirmModal,
} from "../components/ui";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "../utils/passwordValidation";
import { formatDateTime } from "../utils/formatters";
import { getAdminHardDeleteErrorMessage } from "../utils/hardDeleteFeedback";

const roleConfig: Record<
  UserRole,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  [UserRole.ADMIN]: {
    label: "Administrateur",
    icon: <Shield className="w-4 h-4" />,
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40",
  },
  [UserRole.MANAGER]: {
    label: "Manager",
    icon: <UserCog className="w-4 h-4" />,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
  },
  [UserRole.AGENT]: {
    label: "Agent",
    icon: <UsersIcon className="w-4 h-4" />,
    color: "text-primary-700 dark:text-primary-400",
    bgColor: "bg-primary-100 dark:bg-primary-900/40",
  },
  [UserRole.CLIENT]: {
    label: "Client",
    icon: <UserIcon className="w-4 h-4" />,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
  },
};

const internalRoleOptions: UserRole[] = [UserRole.AGENT, UserRole.MANAGER, UserRole.ADMIN];

const emptyInternalUserForm: CreateInternalUserRequest = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  phone: "",
  role: UserRole.AGENT,
};

const inputClass =
  "w-full px-3 py-2.5 border border-ds-border rounded-xl bg-ds-card text-ds-primary placeholder:text-ds-muted text-sm focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500 transition-all";

export default function UsersPage() {
  const toast = useToast();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "ALL">("ALL");
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<UserResponse | null>(null);
  const [showToggleConfirm, setShowToggleConfirm] = useState<UserResponse | null>(null);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState<UserResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState<number | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteVerificationCode, setDeleteVerificationCode] = useState("");
  const [isSendingDeleteCode, setIsSendingDeleteCode] = useState(false);

  const [createForm, setCreateForm] = useState<CreateInternalUserRequest>(emptyInternalUserForm);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const isOauthAdmin = Boolean(currentUser?.role === UserRole.ADMIN && currentUser?.oauthProvider);
  const getUserHardDeleteIdentifier = (user: UserResponse) => String(user.id);
  const isUserHardDeleteReauthValid = isOauthAdmin
    ? deleteVerificationCode.trim().length > 0
    : deletePassword.trim().length > 0;
  const isUserHardDeleteFormInvalid =
    !showHardDeleteConfirm || !isUserHardDeleteReauthValid;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({ page: 0, size: 1000 });
      setUsers(response.content ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (showHardDeleteConfirm) {
      setDeletePassword("");
      setDeleteVerificationCode("");
      return;
    }

    setDeletePassword("");
    setDeleteVerificationCode("");
  }, [showHardDeleteConfirm]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const haystack = `${user.fullName || ""} ${user.email || ""}`.toLowerCase();
        const matchesSearch = haystack.includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === "ALL" || user.role === filterRole;
        return matchesSearch && matchesRole;
      }),
    [users, searchTerm, filterRole],
  );

  const usersByRole = useMemo(
    () =>
      users.reduce(
        (acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        },
        {} as Record<UserRole, number>,
      ),
    [users],
  );

  const closeCreateModal = () => {
    setShowAddModal(false);
    setCreateForm(emptyInternalUserForm);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setEditForm({ firstName: "", lastName: "", phone: "" });
  };

  const closePasswordModal = () => {
    setShowPasswordModal(null);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
  };

  const openEditModal = (user: UserResponse) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
    });
    setShowEditModal(true);
  };

  const toggleUserStatus = async (user: UserResponse) => {
    try {
      if (user.isActive) {
        await userService.deactivateUser(user.id);
        toast.success("Utilisateur desactive.");
      } else {
        await userService.activateUser(user.id);
        toast.success("Utilisateur active.");
      }
      await fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setShowToggleConfirm(null);
    }
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setRoleUpdatingId(userId);
    try {
      await userService.changeRole(userId, newRole);
      toast.success(`Role mis a jour : ${RoleLabels[newRole]}.`);
      await fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleHardDeleteUser = async () => {
    if (!showHardDeleteConfirm) return;

    const providedUserIdentifier =
      getUserHardDeleteIdentifier(showHardDeleteConfirm) || String(showHardDeleteConfirm.id);

    if (!isOauthAdmin && !deletePassword.trim()) {
      toast.error(
        "Saisissez votre mot de passe administrateur pour confirmer cette suppression definitive.",
      );
      return;
    }

    if (isOauthAdmin && !deleteVerificationCode.trim()) {
      toast.error(
        "Saisissez le code de verification recu par email pour confirmer cette suppression definitive.",
      );
      return;
    }

    setDeleteSubmitting(true);
    try {
      await userService.hardDeleteUser(showHardDeleteConfirm.id, {
        confirmationKeyword: "SUPPRIMER",
        confirmationTargetId: providedUserIdentifier,
        currentPassword: isOauthAdmin ? undefined : deletePassword,
        verificationCode: isOauthAdmin ? deleteVerificationCode : undefined,
      });
      toast.success("Utilisateur supprime definitivement.");
      setShowHardDeleteConfirm(null);
      await fetchUsers();
    } catch (err) {
      toast.error(
        getAdminHardDeleteErrorMessage(
          "user",
          err,
          "Suppression definitive impossible pour cet utilisateur.",
        ),
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleRequestDeleteChallenge = async () => {
    if (!showHardDeleteConfirm) return;

    setIsSendingDeleteCode(true);
    try {
      await userService.requestHardDeleteChallenge(showHardDeleteConfirm.id);
      toast.success("Un code de verification a ete envoye sur votre email administrateur.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSendingDeleteCode(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = getPasswordValidationError(createForm.password);
    if (passwordError) {
      toast.addToast("warning", passwordError);
      return;
    }

    const confirmationError = getPasswordConfirmationError(
      createForm.password,
      createForm.confirmPassword,
    );
    if (confirmationError) {
      toast.addToast("warning", confirmationError);
      return;
    }

    setCreateSubmitting(true);
    try {
      const createdUser = await userService.createInternalUser({
        ...createForm,
        phone: createForm.phone?.trim() || undefined,
      });
      toast.success(
        createdUser.emailVerified === false
          ? "Utilisateur interne cree. Un email de verification a ete envoye."
          : "Utilisateur interne cree avec succes.",
      );
      closeCreateModal();
      await fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setEditSubmitting(true);
    try {
      await userService.updateUser(selectedUser.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || undefined,
      });
      toast.success("Utilisateur mis a jour avec succes.");
      closeEditModal();
      await fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal) return;

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

    setPasswordSubmitting(true);
    try {
      await userService.setPasswordByAdmin(showPasswordModal.id, passwordForm.newPassword);
      toast.success("Mot de passe temporaire enregistre.");
      closePasswordModal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ds-primary flex items-center gap-2.5">
            <UsersIcon className="w-7 h-7 text-primary-500" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-ds-muted mt-1">
            Comptes internes, roles, activation et mot de passe temporaire
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Nouvel utilisateur interne
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(roleConfig) as UserRole[]).map((role) => {
          const cfg = roleConfig[role];
          const isSelected = filterRole === role;
          return (
            <Card
              key={role}
              padding="md"
              className={`cursor-pointer transition-all duration-200 hover:shadow-md group ${
                isSelected
                  ? "ring-2 ring-primary-500 dark:ring-primary-400 shadow-md"
                  : "hover:translate-y-[-2px]"
              }`}
              onClick={() => setFilterRole(isSelected ? "ALL" : role)}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`p-2.5 rounded-xl ${cfg.bgColor} ${cfg.color} transition-transform group-hover:scale-110`}
                >
                  {cfg.icon}
                </div>
                <span className="text-3xl font-bold text-ds-primary tabular-nums">
                  {usersByRole[role] ?? 0}
                </span>
              </div>
              <p className={`mt-3 text-sm font-semibold ${cfg.color}`}>{cfg.label}s</p>
            </Card>
          );
        })}
      </div>

      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ds-muted" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleFilter((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 border border-ds-border rounded-xl bg-ds-card text-ds-primary hover:bg-ds-elevated transition-colors w-full md:w-auto text-sm"
            >
              <span className="text-ds-muted">Role :</span>
              <span className="font-medium">
                {filterRole === "ALL" ? "Tous" : roleConfig[filterRole].label}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-ds-muted transition-transform ${
                  showRoleFilter ? "rotate-180" : ""
                }`}
              />
            </button>
            {showRoleFilter && (
              <div className="absolute right-0 mt-2 w-52 bg-ds-card rounded-xl shadow-dropdown border border-ds-border z-20 py-1 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setFilterRole("ALL");
                    setShowRoleFilter(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    filterRole === "ALL"
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium"
                      : "text-ds-primary hover:bg-ds-elevated"
                  }`}
                >
                  <UsersIcon className="w-4 h-4 text-ds-muted" />
                  Tous les roles
                  {filterRole === "ALL" && <Check className="w-4 h-4 ml-auto text-primary-500" />}
                </button>
                {(Object.keys(roleConfig) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setFilterRole(role);
                      setShowRoleFilter(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                      filterRole === role
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium"
                        : "text-ds-primary hover:bg-ds-elevated"
                    }`}
                  >
                    <span className={roleConfig[role].color}>{roleConfig[role].icon}</span>
                    {roleConfig[role].label}
                    {filterRole === role && <Check className="w-4 h-4 ml-auto text-primary-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            loading={loading}
            icon={<RefreshCw size={16} />}
          >
            Actualiser
          </Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <SkeletonTable rows={8} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="w-12 h-12" />}
            title="Aucun utilisateur trouve"
            description="Ajustez les filtres ou ajoutez un utilisateur interne."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table-raw w-full">
              <thead>
                <tr className="border-b border-ds-border bg-ds-elevated/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Derniere connexion
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-ds-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border">
                {filteredUsers.map((user) => {
                  const role = roleConfig[user.role];
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-ds-elevated/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {user.profilePhotoUrl ? (
                            <img
                              src={user.profilePhotoUrl}
                              alt={user.fullName}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-ds-border"
                            />
                          ) : (
                            <div
                              className={`h-10 w-10 rounded-full ${role.bgColor} flex items-center justify-center flex-shrink-0 ring-2 ring-white/50 dark:ring-white/10`}
                            >
                              <span className={`text-sm font-semibold ${role.color}`}>
                                {user.firstName?.charAt(0)}
                                {user.lastName?.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ds-primary text-sm">
                                {user.fullName}
                              </p>
                              {isSelf && <Badge variant="default">Vous</Badge>}
                            </div>
                            <p className="text-xs text-ds-muted">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 text-sm text-ds-primary">
                            <Mail className="w-3.5 h-3.5 text-ds-muted flex-shrink-0" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-2 text-xs text-ds-muted">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={roleUpdatingId === user.id || isSelf}
                          className={`text-sm font-medium rounded-lg border border-ds-border bg-ds-card py-1.5 px-2.5 ${role.color} focus:ring-2 focus:ring-primary-400/30 transition-all cursor-pointer disabled:opacity-60`}
                        >
                          {(Object.keys(UserRole) as UserRole[]).map((r) => (
                            <option key={r} value={r}>
                              {RoleLabels[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        {isSelf ? (
                          user.isActive ? (
                            <Badge variant="success" icon={<Check className="w-3 h-3" />}>
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="danger" icon={<X className="w-3 h-3" />}>
                              Inactif
                            </Badge>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowToggleConfirm(user)}
                            className="inline-flex"
                          >
                            {user.isActive ? (
                              <Badge variant="success" icon={<Check className="w-3 h-3" />}>
                                Actif
                              </Badge>
                            ) : (
                              <Badge variant="danger" icon={<X className="w-3 h-3" />}>
                                Inactif
                              </Badge>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ds-muted">
                        {user.lastLoginAt ? (
                          formatDateTime(user.lastLoginAt)
                        ) : (
                          <span className="italic">Jamais</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => setShowPasswordModal(user)}
                            className="p-2 text-warning-600 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-lg transition-colors"
                            title="Definir un mot de passe temporaire"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isSelf && user.role !== UserRole.CLIENT && (
                            <button
                              type="button"
                              onClick={() => setShowHardDeleteConfirm(user)}
                              className="p-2 text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                              title="Supprimer definitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="px-5 py-3 border-t border-ds-border flex items-center justify-between">
            <span className="text-xs text-ds-muted">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""} affiche
              {filteredUsers.length > 1 ? "s" : ""}
              {filterRole !== "ALL" && ` (filtre : ${roleConfig[filterRole].label})`}
            </span>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showAddModal}
        onClose={closeCreateModal}
        title="Nouvel utilisateur interne"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <p className="text-sm text-ds-secondary">
            Les comptes clients se creent depuis la gestion des clients.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Prenom *</label>
              <input
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Nom *</label>
              <input
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Email *</label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Telephone</label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Role *</label>
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, role: e.target.value as UserRole }))
              }
              className={inputClass}
            >
              {internalRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {RoleLabels[role]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Mot de passe initial *
            </label>
            <input
              type="password"
              required
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ds-muted">
              Minimum 8 caracteres, avec une majuscule, une minuscule et un chiffre.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Confirmation du mot de passe *
            </label>
            <input
              type="password"
              required
              value={createForm.confirmPassword}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeCreateModal}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" loading={createSubmitting}>
              Creer l'utilisateur
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={closeEditModal}
        title="Modifier l'utilisateur"
        size="md"
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Prenom *</label>
              <input
                required
                value={editForm.firstName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Nom *</label>
              <input
                required
                value={editForm.lastName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Telephone</label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeEditModal}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" loading={editSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!showPasswordModal}
        onClose={closePasswordModal}
        title="Definir un mot de passe temporaire"
        size="md"
      >
        <form onSubmit={handleSetPassword} className="space-y-4">
          <p className="text-sm text-ds-secondary">
            Le nouveau mot de passe sera applique immediatement au compte{" "}
            <span className="font-semibold text-ds-primary">{showPasswordModal?.email}</span>.
          </p>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Nouveau mot de passe *
            </label>
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">
              Confirmation du mot de passe *
            </label>
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closePasswordModal}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" loading={passwordSubmitting}>
              Enregistrer le mot de passe
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!showToggleConfirm}
        onClose={() => setShowToggleConfirm(null)}
        onConfirm={() => showToggleConfirm && toggleUserStatus(showToggleConfirm)}
        title={showToggleConfirm?.isActive ? "Desactiver l'utilisateur" : "Activer l'utilisateur"}
        message={
          showToggleConfirm
            ? showToggleConfirm.isActive
              ? `L'utilisateur ${showToggleConfirm.fullName} ne pourra plus se connecter.`
              : `L'utilisateur ${showToggleConfirm.fullName} pourra a nouveau se connecter.`
            : ""
        }
        confirmLabel={showToggleConfirm?.isActive ? "Desactiver" : "Activer"}
        variant={showToggleConfirm?.isActive ? "danger" : "primary"}
      />

      <ConfirmModal
        isOpen={!!showHardDeleteConfirm}
        onClose={() => {
          if (!deleteSubmitting) setShowHardDeleteConfirm(null);
        }}
        onConfirm={handleHardDeleteUser}
        title="Supprimer definitivement cet utilisateur ?"
        message={
          showHardDeleteConfirm ? (
            <>
              <p>
                Le compte {showHardDeleteConfirm.email} sera retire definitivement.
              </p>
              <p className="mt-2">
                Le backend reaffectera ou nettoiera les references necessaires avant la suppression
                finale pour eviter un etat incoherent.
              </p>
              <div className="mt-3 space-y-3 rounded-xl border border-ds-border bg-ds-surface/70 p-3 text-left">
                <p className="rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-xs text-ds-secondary">
                  Identifiant systeme affiche pour controle :{" "}
                  <span className="font-semibold text-ds-primary">
                    {getUserHardDeleteIdentifier(showHardDeleteConfirm)}
                  </span>
                </p>

                {isOauthAdmin ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ds-muted">
                      Code de verification email
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={deleteVerificationCode}
                        onChange={(event) => setDeleteVerificationCode(event.target.value)}
                        className={inputClass}
                        placeholder="Code a 6 chiffres"
                        autoComplete="one-time-code"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRequestDeleteChallenge}
                        disabled={isSendingDeleteCode || deleteSubmitting}
                      >
                        {isSendingDeleteCode ? "Envoi..." : "Envoyer un code"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ds-muted">
                      Mot de passe administrateur
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      className={inputClass}
                      placeholder="Confirmez avec votre mot de passe"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Supprimer definitivement"
        cancelLabel="Conserver"
        variant="danger"
        loading={deleteSubmitting}
        confirmDisabled={isUserHardDeleteFormInvalid}
        confirmationKeyword="SUPPRIMER"
        confirmationHint="Tapez SUPPRIMER, puis confirmez votre re-authentification administrateur."
      />
    </div>
  );
}
