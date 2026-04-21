// =============================================================================
// MTS TELECOM - Clients Management
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Search,
  Plus,
  Edit2,
  Building2,
  MapPin,
  Mail,
  Phone,
  RefreshCw,
  Check,
  Ticket,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { clientService, ClientsQueryParams } from "../api/clientService";
import { Client, CreateClientFormData, UserRole } from "../types";
import Toast, { ToastMessage } from "../components/tickets/Toast";
import { Card, Button, EmptyState, SkeletonTable, ConfirmModal, Modal } from "../components/ui";
import { getErrorMessage } from "../api/client";
import { usePermissions } from "../hooks/usePermissions";
import { RootState } from "../redux/store";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "../utils/passwordValidation";
import { getAdminHardDeleteErrorMessage } from "../utils/hardDeleteFeedback";

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_SORT = "companyName";
const DEFAULT_DIRECTION = "ASC" as const;

type SortField = "companyName" | "clientCode" | "userEmail" | "createdAt";

const emptyCreateForm: CreateClientFormData = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  phone: "",
  companyName: "",
  address: "",
};

export default function ClientsPage() {
  const { canCreateClient, canUpdateClient, canDeleteClient, canArchiveClient } = usePermissions();
  const [pageResponse, setPageResponse] = useState<{
    content: Client[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  }>({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [direction, setDirection] = useState<"ASC" | "DESC">(DEFAULT_DIRECTION);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [clientToHardDelete, setClientToHardDelete] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteVerificationCode, setDeleteVerificationCode] = useState("");
  const [isSendingDeleteCode, setIsSendingDeleteCode] = useState(false);

  const [createForm, setCreateForm] = useState<CreateClientFormData>(emptyCreateForm);
  const [editForm, setEditForm] = useState({ companyName: "", address: "" });
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === ("ADMIN" as UserRole);
  const isOauthAdmin = Boolean(isAdmin && currentUser?.oauthProvider);
  const getClientHardDeleteIdentifier = (client: Client) => client.clientCode?.trim() || "";
  const isClientHardDeleteReauthValid = isOauthAdmin
    ? deleteVerificationCode.trim().length > 0
    : deletePassword.trim().length > 0;
  const isClientHardDeleteFormInvalid =
    !clientToHardDelete || !isClientHardDeleteReauthValid;

  const fetchClients = useCallback(
    async (overrides?: Partial<ClientsQueryParams>) => {
      try {
        setLoading(true);
        const params: ClientsQueryParams = {
          page: overrides?.page ?? page,
          size: overrides?.size ?? size,
          sort: overrides?.sort ?? sort,
          direction: overrides?.direction ?? direction,
          search: (overrides?.search !== undefined ? overrides.search : searchTerm) || undefined,
        };
        const response = await clientService.getClients(params);
        setPageResponse({
          content: response.content ?? [],
          totalElements: response.totalElements ?? response.content?.length ?? 0,
          totalPages: response.totalPages ?? 1,
          number: response.number ?? 0,
          size: response.size ?? size,
        });
      } catch (error) {
        setToast({ message: getErrorMessage(error), type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [direction, page, searchTerm, size, sort],
  );

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    const newDir = sort === field && direction === "ASC" ? "DESC" : "ASC";
    setSort(field);
    setDirection(newDir);
    setPage(0);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(emptyCreateForm);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedClient(null);
    setEditForm({ companyName: "", address: "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = getPasswordValidationError(createForm.password);
    if (passwordError) {
      setToast({ message: passwordError, type: "error" });
      return;
    }

    const confirmationError = getPasswordConfirmationError(
      createForm.password,
      createForm.confirmPassword ?? "",
    );
    if (confirmationError) {
      setToast({ message: confirmationError, type: "error" });
      return;
    }

    setCreateSubmitting(true);
    try {
      const createdClient = await clientService.createClientFull(createForm);
      setToast({
        message:
          createdClient.userEmailVerified === false
            ? "Client cree. Un email de verification a ete envoye."
            : "Client cree avec succes.",
        type: "success",
      });
      closeCreateModal();
      await fetchClients({ page: 0 });
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setEditSubmitting(true);
    try {
      await clientService.updateClient(selectedClient.id, editForm);
      setToast({ message: "Client mis a jour avec succes.", type: "success" });
      closeEditModal();
      await fetchClients();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setEditForm({
      companyName: client.companyName || "",
      address: client.address || "",
    });
    setShowEditModal(true);
  };

  const handleArchiveToggle = async () => {
    if (!clientToArchive) return;

    setArchiveSubmitting(true);
    try {
      if (clientToArchive.isActive) {
        await clientService.archiveClient(clientToArchive.id);
        setToast({ message: "Client archive avec succes.", type: "success" });
      } else {
        await clientService.restoreClient(clientToArchive.id);
        setToast({ message: "Client reactive avec succes.", type: "success" });
      }
      setClientToArchive(null);
      await fetchClients();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setArchiveSubmitting(false);
    }
  };

  const handleHardDeleteClient = async () => {
    if (!clientToHardDelete) return;

    const providedClientIdentifier =
      getClientHardDeleteIdentifier(clientToHardDelete) || String(clientToHardDelete.id);

    if (!isOauthAdmin && !deletePassword.trim()) {
      setToast({
        message:
          "Saisissez votre mot de passe administrateur pour confirmer cette suppression definitive.",
        type: "error",
      });
      return;
    }

    if (isOauthAdmin && !deleteVerificationCode.trim()) {
      setToast({
        message:
          "Saisissez le code de verification recu par email pour confirmer cette suppression definitive.",
        type: "error",
      });
      return;
    }

    setDeleteSubmitting(true);
    try {
      await clientService.hardDeleteClient(clientToHardDelete.id, {
        confirmationKeyword: "SUPPRIMER",
        confirmationTargetId: providedClientIdentifier,
        currentPassword: isOauthAdmin ? undefined : deletePassword,
        verificationCode: isOauthAdmin ? deleteVerificationCode : undefined,
      });
      setToast({ message: "Client supprime definitivement.", type: "success" });
      setClientToHardDelete(null);
      await fetchClients();
    } catch (error: unknown) {
      setToast({
        message: getAdminHardDeleteErrorMessage(
          "client",
          error,
          "Suppression definitive impossible pour ce client.",
        ),
        type: "error",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleRequestDeleteChallenge = async () => {
    if (!clientToHardDelete) return;

    setIsSendingDeleteCode(true);
    try {
      await clientService.requestHardDeleteChallenge(clientToHardDelete.id);
      setToast({
        message: "Un code de verification a ete envoye sur votre email administrateur.",
        type: "success",
      });
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setIsSendingDeleteCode(false);
    }
  };

  useEffect(() => {
    if (clientToHardDelete) {
      setDeletePassword("");
      setDeleteVerificationCode("");
      return;
    }

    setDeletePassword("");
    setDeleteVerificationCode("");
  }, [clientToHardDelete]);

  const clients = pageResponse.content;
  const totalElements = pageResponse.totalElements;
  const totalPages = Math.max(1, pageResponse.totalPages);
  const currentPage = pageResponse.number;
  const hasPrev = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;
  const from = totalElements === 0 ? 0 : currentPage * pageResponse.size + 1;
  const to = Math.min((currentPage + 1) * pageResponse.size, totalElements);

  const inputClass =
    "w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500";

  const Th = ({
    label,
    sortKey,
    className = "",
  }: {
    label: string;
    sortKey?: SortField;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider ${className}`}
    >
      {sortKey ? (
        <button
          type="button"
          onClick={() => handleSort(sortKey)}
          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {label}
          {sort === sortKey ? (
            direction === "ASC" ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 opacity-50" />
          )}
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ds-primary">Gestion des Clients</h1>
          <p className="text-ds-muted mt-1">
            {totalElements} client{totalElements !== 1 ? "s" : ""} enregistre
            {totalElements !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreateClient && (
          <Button
            variant="primary"
            icon={<Plus size={20} />}
            onClick={() => setShowCreateModal(true)}
          >
            Nouveau client
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          padding="md"
          className="bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Total</p>
              <p className="text-2xl font-bold text-primary-900 dark:text-primary-100 mt-1">
                {totalElements}
              </p>
            </div>
            <Building2 className="w-10 h-10 text-primary-500 dark:text-primary-400" />
          </div>
        </Card>
        <Card
          padding="md"
          className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Avec tickets</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                {clients.filter((client) => (client.ticketCount ?? 0) > 0).length}
              </p>
            </div>
            <Ticket className="w-10 h-10 text-green-500 dark:text-green-400" />
          </div>
        </Card>
        <Card
          padding="md"
          className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Ce mois</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {
                  clients.filter((client) => {
                    if (!client.createdAt) return false;
                    const createdAt = new Date(client.createdAt);
                    const now = new Date();
                    return (
                      createdAt.getMonth() === now.getMonth() &&
                      createdAt.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </div>
            <UserIcon className="w-10 h-10 text-purple-500 dark:text-purple-400" />
          </div>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ds-muted" />
            <input
              type="text"
              placeholder="Rechercher par entreprise, code ou email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className={`${inputClass} pl-10`}
            />
          </div>
          <Button variant="primary" onClick={handleSearch}>
            Rechercher
          </Button>
          <Button
            variant="ghost"
            onClick={() => fetchClients()}
            loading={loading}
            icon={<RefreshCw size={18} />}
          >
            Actualiser
          </Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="Aucun client trouve"
            description={
              canCreateClient
                ? "Ajustez la recherche ou creez le premier client."
                : "Ajustez la recherche pour afficher un client existant."
            }
            action={
              canCreateClient ? (
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  Creer un client
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="ds-table-raw w-full">
                <thead className="bg-ds-card">
                  <tr>
                    <Th label="Client" sortKey="companyName" />
                    <Th label="Code" sortKey="clientCode" />
                    <Th label="Contact" sortKey="userEmail" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                      Adresse
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                      Tickets
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">
                      Etat
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-ds-muted uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-ds-primary">
                              {client.companyName || "Non renseigne"}
                            </p>
                            <p className="text-sm text-ds-muted">{client.userFullName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-ds-primary">
                          {client.clientCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2 text-sm text-ds-primary">
                            <Mail className="w-4 h-4 text-ds-muted" />
                            {client.userEmail}
                          </span>
                          {client.userPhone && (
                            <span className="flex items-center gap-2 text-xs text-ds-muted">
                              <Phone className="w-3 h-3" />
                              {client.userPhone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="flex items-center gap-2 text-sm text-ds-secondary truncate">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {client.address || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                          <Ticket className="w-3 h-3" />
                          {client.ticketCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.isActive
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {client.isActive ? "Actif" : "Archive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canUpdateClient && (
                            <button
                              type="button"
                              onClick={() => openEditModal(client)}
                              className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canArchiveClient && (
                            <button
                              type="button"
                              onClick={() => setClientToArchive(client)}
                              className="p-2 text-warning-600 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-lg"
                              title={client.isActive ? "Archiver" : "Reactiver"}
                            >
                              {client.isActive ? (
                                <Archive className="w-4 h-4" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {canDeleteClient && (
                            <button
                              type="button"
                              onClick={() => setClientToHardDelete(client)}
                              className="p-2 text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg"
                              title="Supprimer definitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-ds-border bg-slate-50 dark:bg-slate-800/50">
              <div className="text-sm text-ds-secondary">
                {totalElements === 0 ? "Aucun resultat" : `${from} - ${to} sur ${totalElements}`}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ds-secondary">Par page</span>
                  <select
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className={`${inputClass} py-1.5 w-20`}
                  >
                    {PAGE_SIZES.map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        {pageSize}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={!hasPrev || loading}
                    icon={<ChevronLeft size={18} />}
                  />
                  <span className="text-sm text-ds-primary px-2">
                    Page {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!hasNext || loading}
                    icon={<ChevronRight size={18} />}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmModal
        isOpen={!!clientToArchive}
        onClose={() => {
          if (!archiveSubmitting) setClientToArchive(null);
        }}
        onConfirm={handleArchiveToggle}
        title={clientToArchive?.isActive ? "Archiver ce client ?" : "Reactiver ce client ?"}
        message={
          clientToArchive ? (
            clientToArchive.isActive ? (
              <>
                <p>
                  Le client {clientToArchive.clientCode} sera conserve en base, mais son compte ne
                  pourra plus se connecter.
                </p>
                <p className="mt-2">
                  Les tickets, l'historique et la traçabilite seront conserves.
                </p>
              </>
            ) : (
              `Le client ${clientToArchive.clientCode} pourra a nouveau se connecter et etre gere normalement.`
            )
          ) : (
            ""
          )
        }
        confirmLabel={clientToArchive?.isActive ? "Archiver" : "Reactiver"}
        cancelLabel="Annuler"
        variant={clientToArchive?.isActive ? "warning" : "primary"}
        loading={archiveSubmitting}
      />

      <ConfirmModal
        isOpen={!!clientToHardDelete}
        onClose={() => {
          if (!deleteSubmitting) setClientToHardDelete(null);
        }}
        onConfirm={handleHardDeleteClient}
        title="Supprimer definitivement ce client ?"
        message={
          clientToHardDelete ? (
            <>
              <p>
                Le client {clientToHardDelete.clientCode} et son compte associe seront supprimes
                definitivement.
              </p>
              <p className="mt-2">
                Les tickets du client, son compte d'acces et les relations associees seront
                nettoyes cote backend pour aboutir a une suppression reelle et coherente.
              </p>
              <div className="mt-3 space-y-3 rounded-xl border border-ds-border bg-ds-surface/70 p-3 text-left">
                <p className="rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-xs text-ds-secondary">
                  Reference affichee pour controle :{" "}
                  <span className="font-semibold text-ds-primary">
                    {getClientHardDeleteIdentifier(clientToHardDelete) ||
                      `ID ${clientToHardDelete.id}`}
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
                        className="w-full rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-sm text-ds-primary"
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
                      className="w-full rounded-lg border border-ds-border bg-ds-card px-3 py-2 text-sm text-ds-primary"
                      placeholder="Confirmez avec votre mot de passe"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </div>
              <p className="mt-2">
                Cette suppression est irreversible et doit rester exceptionnelle.
              </p>
            </>
          ) : (
            "Cette action est irreversible."
          )
        }
        confirmLabel="Supprimer definitivement"
        cancelLabel="Conserver"
        variant="danger"
        loading={deleteSubmitting}
        confirmDisabled={isClientHardDeleteFormInvalid}
        confirmationKeyword="SUPPRIMER"
        confirmationHint="Tapez SUPPRIMER, puis confirmez votre re-authentification administrateur."
      />

      <Modal
        isOpen={canCreateClient && showCreateModal}
        onClose={closeCreateModal}
        title="Nouveau client"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-ds-secondary">
            Ce flux cree le compte d'acces client et son profil back-office en une seule operation.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ds-primary">Prenom *</label>
              <input
                type="text"
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ds-primary">Nom *</label>
              <input
                type="text"
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Email *</label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">
              Mot de passe initial *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ds-muted">
              Minimum 8 caracteres, avec une majuscule, une minuscule et un chiffre.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">
              Confirmation du mot de passe *
            </label>
            <input
              type="password"
              required
              value={createForm.confirmPassword ?? ""}
              onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Telephone</label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              required
              value={createForm.companyName}
              onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Adresse</label>
            <textarea
              rows={2}
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={closeCreateModal}>
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={<Check className="w-4 h-4" />}
              loading={createSubmitting}
            >
              Creer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={canUpdateClient && showEditModal && selectedClient != null}
        onClose={closeEditModal}
        title="Modifier le client"
        size="lg"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
                <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-ds-primary">{selectedClient?.userFullName}</p>
                <p className="text-sm text-ds-muted">{selectedClient?.clientCode}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={editForm.companyName}
              onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ds-primary">Adresse</label>
            <textarea
              rows={3}
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={closeEditModal}>
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={<Check className="w-4 h-4" />}
              loading={editSubmitting}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
