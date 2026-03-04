// =============================================================================
// MTS TELECOM - Clients Management (refactor: design system, pagination, tri, recherche)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Building2,
  MapPin,
  Hash,
  Mail,
  Phone,
  RefreshCw,
  X,
  Check,
  Ticket,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { clientService, ClientsQueryParams } from "../api/clientService";
import { Client, CreateClientFormData } from "../types";
import Toast, { ToastMessage } from "../components/tickets/Toast";
import { Card, Button, EmptyState, SkeletonTable } from "../components/ui";
import { getErrorMessage } from "../api/client";

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_SORT = "companyName";
const DEFAULT_DIRECTION = "ASC" as const;

type SortField = "companyName" | "clientCode" | "userEmail" | "createdAt";

export default function ClientsPage() {
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [createForm, setCreateForm] = useState<CreateClientFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    address: "",
  });
  const [editForm, setEditForm] = useState({ companyName: "", address: "" });

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
        console.error("Error fetching clients:", error);
        setToast({ message: getErrorMessage(error), type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [page, size, sort, direction, searchTerm]
  );

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    const newDir =
      sort === field && direction === "ASC" ? "DESC" : "ASC";
    setSort(field);
    setDirection(newDir);
    setPage(0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwd = createForm.password;
    if (pwd.length < 8) {
      setToast({ message: "Le mot de passe doit contenir au moins 8 caractères", type: "error" });
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      setToast({ message: "Le mot de passe doit contenir au moins une majuscule", type: "error" });
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      setToast({ message: "Le mot de passe doit contenir au moins un chiffre", type: "error" });
      return;
    }
    try {
      await clientService.createClientFull(createForm);
      setToast({ message: "Client créé avec succès", type: "success" });
      setShowCreateModal(false);
      setCreateForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        companyName: "",
        address: "",
      });
      fetchClients({ page: 0 });
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      await clientService.updateClient(selectedClient.id, editForm);
      setToast({ message: "Client mis à jour avec succès", type: "success" });
      setShowEditModal(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
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
    <th className={`px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase tracking-wider ${className}`}>
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
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ds-primary">
            Gestion des Clients
          </h1>
          <p className="text-ds-muted mt-1">
            {totalElements} client{totalElements !== 1 ? "s" : ""} enregistré
            {totalElements !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>
          Nouveau Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800">
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
        <Card padding="md" className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Avec tickets</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                {clients.filter((c) => (c.ticketCount ?? 0) > 0).length}
              </p>
            </div>
            <Ticket className="w-10 h-10 text-green-500 dark:text-green-400" />
          </div>
        </Card>
        <Card padding="md" className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Ce mois</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {clients.filter((c) => {
                  if (!c.createdAt) return false;
                  const d = new Date(c.createdAt);
                  const n = new Date();
                  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
                }).length}
              </p>
            </div>
            <UserIcon className="w-10 h-10 text-purple-500 dark:text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Search + filters */}
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
          <Button variant="ghost" onClick={() => fetchClients()} loading={loading} icon={<RefreshCw size={18} />}>
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="Aucun client trouvé"
            description="Ajustez la recherche ou créez le premier client."
            action={
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Créer un client
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                              {client.companyName || "Non renseigné"}
                            </p>
                            <p className="text-sm text-ds-muted">
                              {client.userFullName}
                            </p>
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
                          {client.address || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                          <Ticket className="w-3 h-3" />
                          {client.ticketCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(client)}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-ds-border bg-slate-50 dark:bg-slate-800/50">
              <div className="text-sm text-ds-secondary">
                {totalElements === 0
                  ? "Aucun résultat"
                  : `${from} – ${to} sur ${totalElements}`}
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
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={!hasPrev || loading}
                    icon={<ChevronLeft size={18} />}
                  />
                  <span className="text-sm text-ds-primary px-2">
                    Page {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext || loading}
                    icon={<ChevronRight size={18} />}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ds-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-ds-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-ds-primary">Nouveau Client</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-ds-elevated rounded-lg text-ds-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ds-primary mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ds-primary mb-1">Nom *</label>
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
                <label className="block text-sm font-medium text-ds-primary mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Mot de passe *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className={inputClass}
                  placeholder="Min. 8 caractères, une majuscule et un chiffre"
                />
                <p className="mt-1 text-xs text-ds-muted">
                  Minimum 8 caractères, au moins une majuscule et un chiffre
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">
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
                <label className="block text-sm font-medium text-ds-primary mb-1">Adresse</label>
                <textarea
                  rows={2}
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" type="submit" icon={<Check className="w-4 h-4" />}>
                  Créer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ds-card rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-4 sm:p-6 border-b border-ds-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-ds-primary">Modifier le Client</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-ds-elevated rounded-lg text-ds-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-4 sm:p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-ds-primary">
                      {selectedClient.userFullName}
                    </p>
                    <p className="text-sm text-ds-muted">{selectedClient.clientCode}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-primary mb-1">
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
                <label className="block text-sm font-medium text-ds-primary mb-1">Adresse</label>
                <textarea
                  rows={3}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" type="submit" icon={<Check className="w-4 h-4" />}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
