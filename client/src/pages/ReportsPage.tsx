// =============================================================================
// MTS TELECOM - Reports Management V29
// Filtres avancés, Executive Summary, KPIs, export PDF/CSV
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Upload,
  Calendar,
  RefreshCw,
  X,
  Clock,
  Search,
  Sparkles,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Filter,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Toast, { ToastMessage } from "../components/tickets/Toast";
import { reportService, Report, GenerateReportParams } from "../api/reportService";
import { telecomServiceService } from "../api/telecomServiceService";
import { clientService } from "../api/clientService";
import { Card, Button, EmptyState } from "../components/ui";
import { getErrorMessage } from "../api/client";

// =============================================================================
// CONFIGURATION
// =============================================================================

const reportTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  DAILY: { label: "Journalier", color: "text-primary-700 dark:text-primary-400", bgColor: "bg-primary-100 dark:bg-primary-900/40" },
  WEEKLY: { label: "Hebdomadaire", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/40" },
  MONTHLY: { label: "Mensuel", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40" },
  QUARTERLY: { label: "Trimestriel", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40" },
  ANNUAL: { label: "Annuel", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/40" },
  CUSTOM: { label: "Personnalisé", color: "text-ds-primary", bgColor: "bg-ds-elevated" },
};

const ticketStatusOptions = [
  { value: "", label: "Tous les statuts" },
  { value: "NEW", label: "Nouveau" },
  { value: "ASSIGNED", label: "Assigné" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "RESOLVED", label: "Résolu" },
  { value: "CLOSED", label: "Clôturé" },
  { value: "CANCELLED", label: "Annulé" },
];

interface ServiceOption { id: number; name: string; }
interface ClientOption { id: number; companyName: string; }

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

/**
 * ReportsPage V29 – Page de gestion des rapports enrichie.
 *
 * FONCTIONNALITÉS:
 * - Générateur avec filtres avancés (service, équipe, client, statut, format)
 * - KPI cards depuis la réponse (tickets, SLA, incidents, backlog)
 * - Executive Summary affiché en panneau dédié
 * - Export PDF et CSV
 * - Historique des rapports avec indicateurs de format
 * - Upload de rapports PDF manuels
 *
 * ACCÈS: MANAGER, ADMIN
 */
export default function ReportsPage() {
  // ---- État principal ----
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // ---- Modale génération ----
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateReportParams>({
    reportType: "WEEKLY",
    periodStart: "",
    periodEnd: "",
    publish: true,
    serviceId: undefined,
    team: "",
    clientId: undefined,
    ticketStatus: "",
    format: "PDF",
  });

  // ---- Modale upload ----
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    reportType: "MONTHLY",
    periodStart: "",
    periodEnd: "",
    file: null as File | null,
  });

  // ---- Modale re-upload ----
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [reuploadReport, setReuploadReport] = useState<Report | null>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);

  // ---- Executive Summary (panneau) ----
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);

  // ---- Listes pour dropdowns ----
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  // ---- Dernier rapport généré (pour KPIs) ----
  const [lastGenerated, setLastGenerated] = useState<Report | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reportService.getReports({ page: 0, size: 100 });
      setReports(data.content || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  /** Charge les services et clients pour les dropdowns du générateur. */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [svcRes, cltRes] = await Promise.all([
        telecomServiceService.getServices({ page: 0, size: 200 }),
        clientService.getClients({ page: 0, size: 200 }),
      ]);
      setServices(
        (svcRes.content || []).map((s: { id: number; name: string }) => ({
          id: s.id,
          name: s.name,
        }))
      );
      setClients(
        (cltRes.content || [])
          .filter((c) => c.companyName)
          .map((c) => ({
            id: c.id,
            companyName: c.companyName!,
          }))
      );
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchFilterOptions();
  }, [fetchReports, fetchFilterOptions]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.periodStart || !generateForm.periodEnd) {
      setToast({ message: "Veuillez renseigner la période", type: "warning" });
      return;
    }
    setGenerating(true);
    try {
      // Nettoyer les filtres vides avant envoi
      const body: GenerateReportParams = {
        reportType: generateForm.reportType,
        periodStart: generateForm.periodStart,
        periodEnd: generateForm.periodEnd,
        publish: generateForm.publish,
        format: generateForm.format || "PDF",
      };
      if (generateForm.serviceId) body.serviceId = generateForm.serviceId;
      if (generateForm.team && generateForm.team.trim()) body.team = generateForm.team.trim();
      if (generateForm.clientId) body.clientId = generateForm.clientId;
      if (generateForm.ticketStatus) body.ticketStatus = generateForm.ticketStatus;

      const generated = await reportService.generate(body);
      setLastGenerated(generated);
      setToast({ message: `Rapport ${generated.format || "PDF"} généré avec succès`, type: "success" });
      setShowGenerateModal(false);
      resetGenerateForm();
      fetchReports();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const resetGenerateForm = () => {
    setGenerateForm({
      reportType: "WEEKLY",
      periodStart: "",
      periodEnd: "",
      publish: true,
      serviceId: undefined,
      team: "",
      clientId: undefined,
      ticketStatus: "",
      format: "PDF",
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setToast({ message: "Veuillez sélectionner un fichier PDF", type: "warning" });
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadForm.file);
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description);
    formData.append("reportType", uploadForm.reportType);
    formData.append("periodStart", uploadForm.periodStart);
    formData.append("periodEnd", uploadForm.periodEnd);
    formData.append("publish", "true");

    try {
      await reportService.upload(formData);
      setToast({ message: "Rapport uploadé avec succès", type: "success" });
      setShowUploadModal(false);
      setUploadForm({ title: "", description: "", reportType: "MONTHLY", periodStart: "", periodEnd: "", file: null });
      fetchReports();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    }
  };

  const handleReupload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reuploadFile || !reuploadReport) {
      setToast({ message: "Veuillez sélectionner un fichier PDF", type: "warning" });
      return;
    }

    const formData = new FormData();
    formData.append("file", reuploadFile);

    try {
      await reportService.reuploadFile(reuploadReport.id, formData);
      setToast({ message: "Fichier mis à jour avec succès ✓", type: "success" });
      setShowReuploadModal(false);
      setReuploadReport(null);
      setReuploadFile(null);
      fetchReports();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    }
  };

  const openReuploadModal = (report: Report) => {
    setReuploadReport(report);
    setReuploadFile(null);
    setShowReuploadModal(true);
  };

  const handleDownload = async (report: Report) => {
    try {
      const blob = await reportService.download(report.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      fetchReports();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    }
  };

  const handleViewSummary = async (report: Report) => {
    try {
      // Si la réponse list ne contient pas l'executiveSummary, charger le détail
      if (!report.executiveSummary) {
        const detail = await reportService.getReportById(report.id);
        setSelectedReport(detail);
      } else {
        setSelectedReport(report);
      }
      setShowSummaryPanel(true);
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await reportService.deleteReport(id);
      setToast({ message: "Rapport supprimé", type: "success" });
      fetchReports();
    } catch (error: unknown) {
      setToast({ message: getErrorMessage(error), type: "error" });
    }
  };

  // ==========================================================================
  // FILTRAGE LOCAL
  // ==========================================================================

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || report.reportType === filterType;
    return matchesSearch && matchesType;
  });

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ---- HEADER ---- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ds-primary">Rapports</h1>
          <p className="text-ds-muted mt-1">
            Générez, consultez et exportez les rapports d'activité
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            icon={<Sparkles size={20} />} 
            onClick={() => setShowGenerateModal(true)}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            Générer un rapport
          </Button>
          <Button 
            variant="primary" 
            icon={<Upload size={22} />} 
            onClick={() => setShowUploadModal(true)}
            className="shadow-lg hover:shadow-xl transition-all font-semibold text-base px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
          >
            📤 Importer un Rapport
          </Button>
        </div>
      </div>

      {/* ---- KPI CARDS (dernier rapport généré ou stats globales) ---- */}
      <KpiCards reports={reports} lastGenerated={lastGenerated} />

      {/* ---- EXECUTIVE SUMMARY PANEL ---- */}
      {showSummaryPanel && selectedReport && (
        <Card padding="lg" className="border-l-4 border-primary-500">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-ds-primary">Résumé Exécutif</h2>
              <span className="text-xs text-ds-muted">— {selectedReport.title}</span>
            </div>
            <button type="button" onClick={() => setShowSummaryPanel(false)} className="p-1 rounded hover:bg-ds-elevated">
              <X size={20} className="text-ds-muted" />
            </button>
          </div>
          {selectedReport.executiveSummary ? (
            <pre className="whitespace-pre-wrap text-sm text-ds-secondary font-mono bg-ds-elevated rounded-lg p-4 max-h-96 overflow-y-auto">
              {selectedReport.executiveSummary}
            </pre>
          ) : (
            <p className="text-sm text-ds-muted italic">
              Aucun résumé exécutif disponible pour ce rapport.
              Les rapports uploadés manuellement n'incluent pas de résumé automatique.
            </p>
          )}
        </Card>
      )}

      {/* ---- BARRE DE RECHERCHE + FILTRES ---- */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ds-muted" />
            <input
              type="text"
              placeholder="Rechercher un rapport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">Tous les types</option>
            {Object.entries(reportTypeConfig).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>
          <Button variant="ghost" onClick={fetchReports} loading={loading} icon={<RefreshCw size={18} />}>
            Actualiser
          </Button>
        </div>
      </Card>

      {/* ---- TABLE DES RAPPORTS ---- */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 dark:border-primary-400 border-t-transparent" />
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Aucun rapport trouvé"
            description="Ajustez les filtres ou générez votre premier rapport."
            action={
              <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
                Générer un rapport
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ds-card">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">Rapport</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">Format</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">Période</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ds-muted uppercase">Auteur</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-ds-muted uppercase">DL</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-ds-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border">
                {filteredReports.map((report) => {
                  const typeConfig = reportTypeConfig[report.reportType] || reportTypeConfig.CUSTOM;
                  const isCSV = report.format === "CSV" || report.mimeType === "text/csv";
                  return (
                    <tr key={report.id} className="hover:bg-ds-elevated">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCSV
                              ? "bg-green-100 dark:bg-green-900/40"
                              : "bg-red-100 dark:bg-red-900/40"
                          }`}>
                            {isCSV ? (
                              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ds-primary truncate">{report.title}</p>
                            <p className="text-xs text-ds-muted">{report.formattedFileSize || report.fileName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          isCSV
                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                        }`}>
                          {isCSV ? "CSV" : "PDF"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-ds-muted">
                        {report.formattedPeriod || `${report.periodStart} – ${report.periodEnd}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          report.source === "GENERATED"
                            ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                        }`}>
                          {report.sourceLabel || report.source || "Uploadé"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-ds-primary">
                        {report.createdByName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-ds-secondary">
                        {report.downloadCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {report.source === "GENERATED" && (
                            <button
                              type="button"
                              onClick={() => handleViewSummary(report)}
                              className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                              title="Voir le résumé exécutif"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownload(report)}
                            className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openReuploadModal(report)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                            title="Re-uploader le fichier PDF"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ---- MODALE GÉNÉRER RAPPORT (V29 enrichie) ---- */}
      {showGenerateModal && (
        <GenerateModal
          form={generateForm}
          setForm={setGenerateForm}
          generating={generating}
          onSubmit={handleGenerate}
          onClose={() => { setShowGenerateModal(false); resetGenerateForm(); }}
          services={services}
          clients={clients}
        />
      )}

      {/* ---- MODALE UPLOAD ---- */}
      {showUploadModal && (
        <UploadModal
          form={uploadForm}
          setForm={setUploadForm}
          onSubmit={handleUpload}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* ---- MODALE RE-UPLOAD ---- */}
      {showReuploadModal && reuploadReport && (
        <ReuploadModal
          report={reuploadReport}
          file={reuploadFile}
          setFile={setReuploadFile}
          onSubmit={handleReupload}
          onClose={() => {
            setShowReuploadModal(false);
            setReuploadReport(null);
            setReuploadFile(null);
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

/**
 * KPI Cards – Affiche les indicateurs clés.
 * Si un rapport vient d'être généré (lastGenerated), affiche ses KPIs.
 * Sinon, affiche des stats globales depuis la liste.
 */
function KpiCards({ reports, lastGenerated }: { reports: Report[]; lastGenerated: Report | null }) {
  // Si on a un rapport généré récemment avec KPIs
  const kpi = lastGenerated;
  const hasKpis = kpi && kpi.ticketsCreated !== undefined && kpi.ticketsCreated !== null;

  if (hasKpis) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <h3 className="text-sm font-medium text-ds-muted">
            KPIs du dernier rapport généré — {kpi.title}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard label="Tickets créés" value={kpi.ticketsCreated ?? 0} color="primary" />
          <KpiCard label="Résolus" value={kpi.ticketsResolved ?? 0} color="green" />
          <KpiCard label="Critiques" value={kpi.ticketsCritical ?? 0} color="red" />
          <KpiCard label="SLA dépassé" value={kpi.ticketsSlaBreached ?? 0} color="amber" />
          <KpiCard label="Incidents" value={kpi.incidentsCount ?? 0} color="purple" />
          <KpiCard label="Inc. critiques" value={kpi.incidentsCritical ?? 0} color="red" />
          <KpiCard
            label="SLA %"
            value={kpi.slaCompliancePct !== undefined ? `${kpi.slaCompliancePct.toFixed(1)}%` : "N/A"}
            color={
              kpi.slaCompliancePct !== undefined
                ? kpi.slaCompliancePct >= 95 ? "green" : kpi.slaCompliancePct >= 90 ? "amber" : "red"
                : "gray"
            }
          />
          <KpiCard label="Backlog" value={kpi.backlogCount ?? 0} color="gray" />
        </div>
      </div>
    );
  }

  // Stats globales par défaut
  const thisMonth = reports.filter((r) => {
    const created = new Date(r.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const totalDownloads = reports.reduce((sum, r) => sum + (r.downloadCount || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ds-muted">Total Rapports</p>
            <p className="text-2xl font-bold text-ds-primary mt-1">{reports.length}</p>
          </div>
          <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
            <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </Card>
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ds-muted">Mensuels</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {reports.filter((r) => r.reportType === "MONTHLY").length}
            </p>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ds-muted">Ce mois</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{thisMonth}</p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
            <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ds-muted">Téléchargements</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{totalDownloads}</p>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <Download className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Mini KPI card (8-column grid quand des KPIs existent). */
function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: "text-primary-600 dark:text-primary-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
    gray: "text-gray-600 dark:text-gray-400",
  };
  return (
    <Card padding="sm">
      <p className="text-xs font-medium text-ds-muted truncate">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${colorMap[color] || colorMap.gray}`}>{value}</p>
    </Card>
  );
}

// =============================================================================
// MODALE GÉNÉRER RAPPORT (V29 – filtres avancés)
// =============================================================================

function GenerateModal({
  form,
  setForm,
  generating,
  onSubmit,
  onClose,
  services,
  clients,
}: {
  form: GenerateReportParams;
  setForm: React.Dispatch<React.SetStateAction<GenerateReportParams>>;
  generating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  services: ServiceOption[];
  clients: ClientOption[];
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card padding="lg" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ds-primary">Générer un rapport</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-ds-elevated">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-ds-muted mb-4">
          Rapport basé sur les tickets et incidents. Inclut un résumé exécutif automatique.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-1">Type de rapport</label>
            <select
              value={form.reportType}
              onChange={(e) => setForm((f) => ({ ...f, reportType: e.target.value }))}
              className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary"
            >
              <option value="DAILY">Journalier</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuel</option>
              <option value="QUARTERLY">Trimestriel</option>
              <option value="ANNUAL">Annuel</option>
              <option value="CUSTOM">Personnalisé</option>
            </select>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Début</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ds-primary mb-1">Fin</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="w-full px-3 py-2 border border-ds-border rounded-lg bg-ds-card text-ds-primary"
                required
              />
            </div>
          </div>

          {/* Format PDF / CSV */}
          <div>
            <label className="block text-sm font-medium text-ds-primary mb-2">Format de sortie</label>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  form.format !== "CSV"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "border-ds-border bg-ds-card text-ds-secondary hover:border-ds-muted"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="PDF"
                  checked={form.format !== "CSV"}
                  onChange={() => setForm((f) => ({ ...f, format: "PDF" }))}
                  className="sr-only"
                />
                <FileText size={18} />
                <span className="font-medium">PDF</span>
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  form.format === "CSV"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "border-ds-border bg-ds-card text-ds-secondary hover:border-ds-muted"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="CSV"
                  checked={form.format === "CSV"}
                  onChange={() => setForm((f) => ({ ...f, format: "CSV" }))}
                  className="sr-only"
                />
                <FileSpreadsheet size={18} />
                <span className="font-medium">CSV</span>
              </label>
            </div>
          </div>

          {/* Filtres avancés (collapsible) */}
          <div className="border border-ds-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-ds-elevated text-sm font-medium text-ds-primary hover:bg-ds-card transition-colors"
            >
              <span className="flex items-center gap-2">
                <Filter size={16} className="text-ds-muted" />
                Filtres avancés
              </span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showAdvanced && (
              <div className="p-4 space-y-3">
                {/* Service */}
                <div>
                  <label className="block text-xs font-medium text-ds-muted mb-1">Service</label>
                  <select
                    value={form.serviceId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-ds-card text-ds-primary"
                  >
                    <option value="">Tous les services</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {/* Client */}
                <div>
                  <label className="block text-xs font-medium text-ds-muted mb-1">Client</label>
                  <select
                    value={form.clientId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-ds-card text-ds-primary"
                  >
                    <option value="">Tous les clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
                {/* Équipe */}
                <div>
                  <label className="block text-xs font-medium text-ds-muted mb-1">Équipe (nom de l'agent)</label>
                  <input
                    type="text"
                    value={form.team || ""}
                    onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-ds-card text-ds-primary"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                {/* Statut ticket */}
                <div>
                  <label className="block text-xs font-medium text-ds-muted mb-1">Statut ticket</label>
                  <select
                    value={form.ticketStatus || ""}
                    onChange={(e) => setForm((f) => ({ ...f, ticketStatus: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-ds-border rounded-lg bg-ds-card text-ds-primary"
                  >
                    {ticketStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Publier */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.publish ?? true}
              onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))}
              className="rounded border-ds-border"
            />
            <span className="text-sm text-ds-primary">Publier immédiatement</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={generating} icon={<Sparkles size={18} />}>
              Générer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// =============================================================================
// MODALE UPLOAD (inchangée)
// =============================================================================

function UploadModal({
  form,
  setForm,
  onSubmit,
  onClose,
}: {
  form: { title: string; description: string; reportType: string; periodStart: string; periodEnd: string; file: File | null };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-ds-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-primary-200 dark:border-primary-800">
        <div className="p-5 sm:p-6 border-b border-ds-border flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ds-primary">📤 Importer un Rapport</h3>
              <p className="text-sm text-ds-muted mt-0.5">Uploadez un rapport PDF existant</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ds-elevated rounded-lg text-ds-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Fichier PDF - En premier pour attirer l'attention */}
          <div className="border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-xl p-6 bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-100/50 dark:hover:bg-primary-900/20 transition-colors">
            <label className="block text-base font-semibold text-ds-primary mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Fichier PDF *
            </label>
            <input 
              type="file" 
              required 
              accept=".pdf" 
              onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} 
              className="w-full px-4 py-3 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700 cursor-pointer transition-all" 
            />
            {form.file && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium flex items-center gap-1">
                ✓ {form.file.name} ({(form.file.size / 1024).toFixed(1)} Ko)
              </p>
            )}
            <p className="text-xs text-ds-muted mt-2">Format PDF uniquement, max 10 Mo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-ds-primary mb-2">Titre du rapport *</label>
              <input 
                type="text" 
                required 
                value={form.title} 
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} 
                className="w-full px-4 py-2.5 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all" 
                placeholder="Ex: Rapport mensuel - Février 2026" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-ds-primary mb-2">Type de rapport *</label>
              <select 
                required 
                value={form.reportType} 
                onChange={(e) => setForm((f) => ({ ...f, reportType: e.target.value }))} 
                className="w-full px-4 py-2.5 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500 transition-all"
              >
                {Object.entries(reportTypeConfig).map(([type, config]) => (
                  <option key={type} value={type}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              {/* Spacer pour alignement */}
            </div>

            <div>
              <label className="block text-sm font-semibold text-ds-primary mb-2">Date début *</label>
              <input 
                type="date" 
                required 
                value={form.periodStart} 
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} 
                className="w-full px-4 py-2.5 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500 transition-all" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-ds-primary mb-2">Date fin *</label>
              <input 
                type="date" 
                required 
                value={form.periodEnd} 
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} 
                className="w-full px-4 py-2.5 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500 transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ds-primary mb-2">Description (optionnel)</label>
            <textarea 
              rows={3} 
              value={form.description} 
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} 
              className="w-full px-4 py-2.5 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-500 transition-all resize-none" 
              placeholder="Ajoutez des détails supplémentaires sur ce rapport..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-ds-border">
            <Button type="button" variant="secondary" onClick={onClose} className="px-6">
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              icon={<Upload className="w-4 h-4" />}
              className="px-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg font-semibold"
            >
              📤 Importer le Rapport
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
// =============================================================================
// MODALE RE-UPLOAD - Remplacer le fichier PDF d'un rapport existant
// =============================================================================

function ReuploadModal({
  report,
  file,
  setFile,
  onSubmit,
  onClose,
}: {
  report: Report;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-ds-card rounded-2xl shadow-2xl max-w-lg w-full border border-green-200 dark:border-green-800">
        <div className="p-5 sm:p-6 border-b border-ds-border flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ds-primary">🔄 Re-uploader le Fichier</h3>
              <p className="text-sm text-ds-muted mt-0.5">Remplacer le PDF du rapport</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ds-elevated rounded-lg text-ds-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Infos du rapport actuel */}
          <div className="bg-ds-elevated rounded-lg p-4 border border-ds-border">
            <p className="text-xs font-medium text-ds-muted mb-2">Rapport actuel:</p>
            <p className="font-semibold text-ds-primary mb-1">{report.title}</p>
            <div className="flex items-center gap-3 text-sm text-ds-secondary">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {report.fileName}
              </span>
              <span className="text-ds-muted">•</span>
              <span>{report.formattedFileSize || `${(report.fileSize / 1024).toFixed(1)} Ko`}</span>
            </div>
          </div>

          {/* Nouveau fichier */}
          <div className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl p-6 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors">
            <label className="block text-base font-semibold text-ds-primary mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Nouveau Fichier PDF *
            </label>
            <input 
              type="file" 
              required 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="w-full px-4 py-3 border-2 border-ds-border rounded-lg bg-ds-card text-ds-primary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer transition-all" 
            />
            {file && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium flex items-center gap-1">
                ✓ {file.name} ({(file.size / 1024).toFixed(1)} Ko)
              </p>
            )}
            <p className="text-xs text-ds-muted mt-2">
              Ce fichier remplacera l'actuel. Les métadonnées du rapport seront conservées.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Attention</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Le fichier actuel sera remplacé de manière permanente. Cette action ne peut pas être annulée.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-ds-border">
            <Button type="button" variant="secondary" onClick={onClose} className="px-6">
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              icon={<Upload className="w-4 h-4" />}
              className="px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg font-semibold"
            >
              🔄 Remplacer le Fichier
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}