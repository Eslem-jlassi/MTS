// =============================================================================
// MTS TELECOM - Users Management (refactor: design system, rôles, reset password)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect } from "react";
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
  Filter,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { userService } from "../api/userService";
import { User, UserRole, RoleLabels } from "../types";
import Toast, { ToastMessage } from "../components/tickets/Toast";
import { Card, Button, Badge, EmptyState, SkeletonTable } from "../components/ui";
import { getErrorMessage } from "../api/client";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "ALL">("ALL");
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState<number | null>(null);
  const [resetPwdId, setResetPwdId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({ page: 0, size: 1000 });
      setUsers(response.content ?? []);
    } catch (err) {
      console.error(err);
      setToast({ message: getErrorMessage(err), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const usersByRole = users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    },
    {} as Record<UserRole, number>
  );

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await userService.deactivateUser(userId);
        setToast({ message: "Utilisateur désactivé", type: "success" });
      } else {
        await userService.activateUser(userId);
        setToast({ message: "Utilisateur activé", type: "success" });
      }
      fetchUsers();
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: "error" });
    }
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setRoleUpdatingId(userId);
    try {
      await userService.changeRole(userId, newRole);
      setToast({ message: `Rôle mis à jour : ${RoleLabels[newRole]}`, type: "success" });
      fetchUsers();
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: "error" });
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleResetPassword = async (userId: number) => {
    setResetPwdId(userId);
    try {
      await userService.resetPassword(userId);
      setToast({
        message: "Un email de réinitialisation a été envoyé à l'utilisateur.",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: getErrorMessage(err),
        type: "error",
      });
    } finally {
      setResetPwdId(null);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ds-primary">
            Gestion des Utilisateurs
          </h1>
          <p className="text-ds-muted mt-1">
            Gérez les accès et les rôles
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={20} />} onClick={() => setShowAddModal(true)}>
          Nouvel Utilisateur
        </Button>
      </div>

      {/* Stats by role */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(roleConfig) as UserRole[]).map((role) => (
          <Card
            key={role}
            padding="md"
            className={`cursor-pointer transition-all hover:shadow-md ${
              filterRole === role ? "ring-2 ring-primary-500 dark:ring-primary-400" : ""
            } ${roleConfig[role].bgColor}`}
            onClick={() => setFilterRole(filterRole === role ? "ALL" : role)}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg bg-ds-card ${roleConfig[role].color}`}>
                {roleConfig[role].icon}
              </div>
              <span className="text-2xl font-bold text-ds-primary">
                {usersByRole[role] ?? 0}
              </span>
            </div>
            <p className={`mt-2 text-sm font-medium ${roleConfig[role].color}`}>
              {roleConfig[role].label}s
            </p>
          </Card>
        ))}
      </div>

      {/* Search + role filter */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ds-muted" />
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
              onClick={() => setShowRoleFilter(!showRoleFilter)}
              className="flex items-center gap-2 px-4 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary hover:bg-ds-elevated w-full md:w-auto"
            >
              <Filter className="w-5 h-5" />
              <span>{filterRole === "ALL" ? "Tous les rôles" : roleConfig[filterRole].label}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showRoleFilter && (
              <div className="absolute right-0 mt-2 w-48 bg-ds-card rounded-lg shadow-lg border border-ds-border z-10 py-1">
                <button
                  type="button"
                  onClick={() => { setFilterRole("ALL"); setShowRoleFilter(false); }}
                  className={`w-full px-4 py-2 text-left text-sm ${
                    filterRole === "ALL"
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      : "text-ds-primary hover:bg-ds-elevated"
                  }`}
                >
                  Tous les rôles
                </button>
                {(Object.keys(roleConfig) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => { setFilterRole(role); setShowRoleFilter(false); }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      filterRole === role
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        : "text-ds-primary hover:bg-ds-elevated"
                    }`}
                  >
                    {roleConfig[role].icon}
                    {roleConfig[role].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={fetchUsers} loading={loading} icon={<RefreshCw size={18} />}>
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <SkeletonTable rows={8} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="w-12 h-12" />}
            title="Aucun utilisateur trouvé"
            description="Ajustez les filtres ou créez un nouvel utilisateur."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ds-card">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                    Dernière connexion
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-ds-muted uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border">
                {filteredUsers.map((user) => {
                  const role = roleConfig[user.role];
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-ds-elevated transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.profilePhotoUrl ? (
                            <img
                              src={user.profilePhotoUrl}
                              alt={user.fullName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`h-10 w-10 rounded-full ${role.bgColor} flex items-center justify-center flex-shrink-0`}
                            >
                              <span className={`text-sm font-medium ${role.color}`}>
                                {user.firstName?.charAt(0)}
                                {user.lastName?.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-ds-primary">
                              {user.fullName}
                            </p>
                            <p className="text-xs text-ds-muted">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2 text-sm text-ds-primary">
                            <Mail className="w-4 h-4 text-ds-muted" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-2 text-xs text-ds-muted">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={roleUpdatingId === user.id}
                          className={`text-sm rounded border border-ds-border bg-ds-card py-1.5 px-2 ${role.color}`}
                        >
                          {(Object.keys(UserRole) as UserRole[]).map((r) => (
                            <option key={r} value={r}>
                              {RoleLabels[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
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
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-sm text-ds-muted">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Jamais"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={resetPwdId === user.id}
                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-ds-primary mb-4">
              Nouvel Utilisateur
            </h3>
            <p className="text-ds-muted mb-4">
              Création d'utilisateur interne (hors inscription client) : à implémenter côté backend (endpoint dédié ou inscription avec rôle).
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
