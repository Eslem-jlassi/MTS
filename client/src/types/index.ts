// =============================================================================
// MTS TELECOM SUPERVISION SYSTEM - Définitions de types TypeScript
// Billcom Consulting - PFE 2026
// =============================================================================
/**
 * ============================================================================
 * types/index.ts - Définitions de tous les types TypeScript
 * ============================================================================
 *
 * POURQUOI TYPESCRIPT?
 * --------------------
 * TypeScript ajoute le typage statique à JavaScript.
 * Avantages:
 * - Détection des erreurs à la compilation (pas à l'exécution)
 * - Auto-complétion intelligente dans l'éditeur
 * - Documentation intégrée au code
 * - Refactoring sécurisé
 *
 * TYPES VS INTERFACES:
 * - interface: Pour les objets, peut être étendue (extends)
 * - type: Plus flexible, pour les unions, tuples, etc.
 * - enum: Pour les valeurs fixes prédéfinies
 *
 * CE FICHIER CONTIENT:
 * - Enums: Valeurs prédéfinies (rôles, statuts, priorités)
 * - Interfaces: Structure des objets (User, Ticket, Client)
 * - Types de requêtes/réponses: Pour les appels API
 *
 * ============================================================================
 */

import { Dispatch, SetStateAction } from "react";

// =============================================================================
// ENUMS - Valeurs prédéfinies constantes
// =============================================================================
/**
 * Les enums définissent un ensemble de valeurs nommées.
 * Avantages:
 * - Auto-complétion dans l'éditeur
 * - Évite les fautes de frappe
 * - Documentation implicite des valeurs possibles
 *
 * Les valeurs STRING (ex: "CLIENT") correspondent aux enums Java du backend.
 * Cela garantit la compatibilité entre frontend et backend.
 */

/**
 * Rôles des utilisateurs dans le système.
 *
 * - CLIENT: Utilisateur client qui crée des tickets
 * - AGENT: Agent de support qui traite les tickets
 * - MANAGER: Superviseur qui gère l'équipe
 * - ADMIN: Administrateur avec accès total
 */
export enum UserRole {
  CLIENT = "CLIENT",
  AGENT = "AGENT",
  MANAGER = "MANAGER",
  ADMIN = "ADMIN",
}

/**
 * Statuts possibles d'un ticket.
 *
 * CYCLE DE VIE:
 * NEW → IN_PROGRESS → PENDING (optionnel) → RESOLVED → CLOSED
 *           ↓
 *       ESCALATED (si problème complexe)
 *           ↓
 *       CANCELLED (si annulé par le client)
 */
export enum TicketStatus {
  NEW = "NEW", // Vient d'être créé
  ASSIGNED = "ASSIGNED", // Assigné à un agent
  IN_PROGRESS = "IN_PROGRESS", // En cours de traitement
  PENDING = "PENDING", // En attente client
  PENDING_THIRD_PARTY = "PENDING_THIRD_PARTY", // En attente tiers
  ESCALATED = "ESCALATED", // Escaladé
  RESOLVED = "RESOLVED", // Solution trouvée
  CLOSED = "CLOSED", // Terminé et archivé
  CANCELLED = "CANCELLED", // Annulé
}

/**
 * Niveaux de priorité des tickets.
 *
 * La priorité détermine le SLA (temps de résolution):
 * - CRITICAL: 4 heures (urgence maximale)
 * - HIGH: 8 heures
 * - MEDIUM: 24 heures (par défaut)
 * - LOW: 48 heures
 */
export enum TicketPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * Catégories de tickets.
 *
 * - PANNE: Problème technique (service en panne)
 * - DEMANDE: Demande d'information ou d'assistance
 * - EVOLUTION: Demande d'évolution du service
 * - AUTRE: Autres types de demandes
 */
export enum TicketCategory {
  PANNE = "PANNE",
  DEMANDE = "DEMANDE",
  EVOLUTION = "EVOLUTION",
  AUTRE = "AUTRE",
}

/**
 * Catégories de services télécom.
 *
 * - BILLING: Facturation
 * - CRM: Gestion de la relation client
 * - NETWORK: Réseau (fibre, 4G, etc.)
 * - INFRA: Infrastructure
 * - OTHER: Autres services
 */
export enum ServiceCategory {
  BILLING = "BILLING",
  CRM = "CRM",
  NETWORK = "NETWORK",
  INFRA = "INFRA",
  OTHER = "OTHER",
}

/**
 * État opérationnel d'un service.
 * Valeurs alignées avec le backend Spring Boot (ServiceStatus enum).
 */
export enum ServiceStatus {
  UP = "UP",
  DEGRADED = "DEGRADED",
  DOWN = "DOWN",
  MAINTENANCE = "MAINTENANCE",
}

// =============================================================================
// TYPES UTILISATEUR
// =============================================================================

/**
 * Interface de base pour un utilisateur.
 *
 * Les "?" indiquent des champs optionnels (peuvent être undefined).
 */
export interface User {
  id: number; // Identifiant unique
  email: string; // Email (identifiant de connexion)
  firstName: string; // Prénom
  lastName: string; // Nom
  fullName: string; // Nom complet (calculé)
  role: UserRole; // Rôle (enum)
  phone?: string; // Téléphone (optionnel)
  profilePhotoUrl?: string; // URL photo de profil (optionnel)
  isActive: boolean; // Compte actif ou désactivé
  createdAt: string; // Date de création (ISO string)
  lastLoginAt?: string; // Dernière connexion (optionnel)
  oauthProvider?: string; // Fournisseur OAuth (GOOGLE, etc.) ou null
  emailVerified?: boolean; // Adresse email vérifiée
}

/**
 * Réponse utilisateur enrichie.
 *
 * "extends User": Hérite de tous les champs de User
 * + ajoute des champs supplémentaires
 */
export interface UserResponse extends User {
  clientInfo?: ClientInfo; // Infos client (si rôle CLIENT)
  ticketStats?: TicketStats; // Statistiques de tickets
  supportSignature?: string; // Signature support (pour agents/managers)
  preferredLanguage?: string; // Langue préférée (fr, en)
}

export interface NotificationPreferences {
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

/**
 * Informations spécifiques au client.
 */
export interface ClientInfo {
  id: number;
  clientCode: string; // Code client (ex: CLI-2024-001)
  companyName?: string; // Nom de l'entreprise
  address?: string; // Adresse
}

/**
 * Statistiques de tickets pour un utilisateur.
 */
export interface TicketStats {
  totalTickets: number; // Nombre total de tickets
  openTickets: number; // Tickets en cours
  resolvedTickets: number; // Tickets résolus
  averageResolutionTime?: number; // Temps moyen de résolution (heures)
}

// =============================================================================
// TYPES D'AUTHENTIFICATION
// =============================================================================

/**
 * Données envoyées pour la connexion.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Données envoyées pour l'inscription.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string; // Confirmation du mot de passe
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string; // Pour les clients
  address?: string; // Pour les clients
  role?: UserRole; // Rôle de l'utilisateur (CLIENT par défaut)
}

export interface CreateInternalUserRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
}

/**
 * Réponse après connexion/inscription réussie.
 */
export interface AuthResponse {
  accessToken?: string | null; // Null en mode cookie-first navigateur
  refreshToken?: string | null; // Null en mode cookie-first navigateur
  tokenType?: string; // Type de token (Cookie, Bearer, etc.)
  expiresIn?: number; // Durée de validité en ms
  user: UserResponse; // Infos de l'utilisateur
  emailVerificationRequired?: boolean;
  emailVerificationSent?: boolean;
}

export interface AdminHardDeleteRequestPayload {
  confirmationKeyword: string;
  confirmationTargetId: string;
  currentPassword?: string;
  verificationCode?: string;
}

// =============================================================================
// TYPES CLIENT
// =============================================================================

/**
 * Profil client complet.
 */
export interface Client {
  id: number;
  clientCode: string;
  companyName?: string;
  address?: string;
  userId: number; // ID de l'utilisateur associé
  userEmail: string; // Email de l'utilisateur
  userFullName: string; // Nom complet
  userPhone?: string; // Téléphone de l'utilisateur
  userEmailVerified?: boolean;
  isActive: boolean;
  ticketCount: number; // Nombre de tickets créés
  createdAt: string;
  updatedAt?: string;
}

/**
 * Données pour créer un profil client (lié à un utilisateur existant).
 */
export interface CreateClientRequest {
  userId: number;
  companyName?: string;
  address?: string;
}

/**
 * Formulaire complet de création d'un client (crée user + profil client).
 * Utilisé côté admin pour ajouter un nouveau client avec son compte utilisateur.
 */
export interface CreateClientFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  address: string;
}

// =============================================================================
// TYPES SERVICE TÉLÉCOM
// =============================================================================

/**
 * Criticité d'un service télécom.
 */
export enum ServiceCriticality {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * Service télécom proposé par l'entreprise.
 */
export interface TelecomService {
  id: number;
  name: string;
  category: ServiceCategory;
  categoryLabel?: string;
  description?: string;
  isActive: boolean;
  status?: ServiceStatus | string;
  statusLabel?: string;

  // KPIs
  availabilityPct?: number;
  avgLatencyMs?: number;
  mttrMinutes?: number;

  // Owner
  ownerId?: number;
  ownerName?: string;

  // Criticality
  criticality?: ServiceCriticality;
  criticalityLabel?: string;

  // SLA Policy
  slaPolicyId?: number;
  slaPolicyName?: string;

  // Creator
  createdById?: number;
  createdByName?: string;

  // Counts
  ticketCount: number;
  activeIncidentCount?: number;
  slaBreachedCount?: number;

  createdAt: string;
  updatedAt?: string;
}

export interface CreateServiceRequest {
  name: string;
  category: ServiceCategory;
  description?: string;
  status?: ServiceStatus;
  ownerId?: number;
  criticality?: ServiceCriticality;
  slaPolicyId?: number;
  isActive?: boolean;
}

// =============================================================================
// TICKET TYPES
// =============================================================================

export interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description?: string;
  status: TicketStatus;
  statusLabel?: string;
  statusColor?: string;
  priority: TicketPriority;
  priorityLabel?: string;
  priorityColor?: string;
  category: TicketCategory;
  categoryLabel?: string;

  // Relationships (flattened)
  clientId: number;
  clientName?: string;
  clientCode?: string;
  clientCompanyName?: string;
  serviceId: number;
  serviceName?: string;
  serviceCategory?: ServiceCategory;
  createdById: number;
  createdByName?: string;
  assignedToId?: number;
  assignedToName?: string;

  // SLA Information
  slaHours: number;
  deadline: string;
  breachedSla: boolean;
  slaPercentage?: number;
  slaWarning?: boolean;
  overdue?: boolean;
  slaRemainingMinutes?: number;

  // Resolution
  resolution?: string;
  rootCause?: string;
  finalCategory?: TicketCategory;
  timeSpentMinutes?: number;
  impact?: string;

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;

  // Related data
  comments?: TicketComment[];
  history?: TicketHistory[];
  attachments?: TicketAttachmentInfo[];
  commentCount: number;
  allowedTransitions?: TicketStatus[];
}

export interface TicketAttachmentInfo {
  id: number;
  fileName: string;
  fileSize?: number;
  contentType?: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description?: string;
  priority: TicketPriority;
  category: TicketCategory;
  serviceId: number;
  assignedToId?: number;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}

export interface TicketStatusChangeRequest {
  newStatus: TicketStatus;
  resolution?: string;
  rootCause?: string;
  finalCategory?: TicketCategory;
  timeSpentMinutes?: number;
  impact?: string;
  comment?: string;
  isInternal?: boolean;
}

export interface TicketAssignRequest {
  agentId: number;
  comment?: string;
}

// =============================================================================
// TICKET COMMENT TYPES
// =============================================================================

export interface TicketComment {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: UserRole;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface CreateCommentRequest {
  content: string;
  isInternal: boolean;
}

// =============================================================================
// TICKET HISTORY TYPES
// =============================================================================

export interface TicketHistory {
  id: number;
  ticketId: number;
  userId: number;
  userName: string;
  action: string;
  actionLabel: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
  createdAt: string;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

/** Statistiques par agent (inclus dans DashboardStats pour ADMIN/MANAGER). */
export interface AgentStats {
  agentId: number;
  agentName: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResolutionTimeHours: number;
}

/** Point de tendance quotidienne (sparklines, 7j/30j). */
export interface DailyTrendPoint {
  date: string;
  created: number;
  resolved: number;
  active: number;
}

/** Snapshot période précédente pour comparaison. */
export interface PreviousPeriodSnapshot {
  resolvedThisMonth: number;
  activeTickets: number;
  totalTickets: number;
  slaBreachedCount: number;
}

export interface DashboardStats {
  totalTickets: number;
  activeTickets: number;
  /** Résolus ce mois (mois en cours). */
  resolvedThisMonth?: number;
  slaBreachedCount: number;
  /** Temps moyen de résolution en heures (backend: averageResolutionTimeHours). */
  averageResolutionTimeHours?: number;
  /** Alias pour compatibilité. */
  averageResolutionHours?: number;
  slaComplianceRate?: number;
  ticketsByStatus?: Record<string, number>;
  ticketsByPriority?: Record<string, number>;
  ticketsByService?: Record<string, number>;
  /** Performance par agent (ADMIN/MANAGER uniquement). */
  agentStats?: AgentStats[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unassignedCount: number;
  createdToday: number;
  resolvedToday: number;
  /** Premium: séries 7j / 30j pour sparklines et tendances. */
  trendLast7Days?: DailyTrendPoint[];
  trendLast30Days?: DailyTrendPoint[];
  /** Premium: comparaison période précédente. */
  previousPeriodSnapshot?: PreviousPeriodSnapshot;
}

export interface AgentPerformance {
  agentId: number;
  agentName: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResolutionHours: number;
  slaComplianceRate: number;
}

// =============================================================================
// INCIDENT TYPES (ITSM - Supervision)
// =============================================================================

/** Statut d'un incident de supervision. */
export enum IncidentStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

/** Sévérité incident (aligné backend Severity). */
export enum Severity {
  CRITICAL = "CRITICAL",
  MAJOR = "MAJOR",
  MINOR = "MINOR",
  LOW = "LOW",
}

/** Impact business d'un incident. */
export enum IncidentImpact {
  LOCALIZED = "LOCALIZED",
  PARTIAL = "PARTIAL",
  MAJOR = "MAJOR",
  TOTAL = "TOTAL",
}

/** Type d'événement timeline incident. */
export enum IncidentTimelineEventType {
  STATUS_CHANGE = "STATUS_CHANGE",
  NOTE = "NOTE",
  UPDATE = "UPDATE",
  POST_MORTEM = "POST_MORTEM",
  TICKET_LINKED = "TICKET_LINKED",
  TICKET_UNLINKED = "TICKET_UNLINKED",
  SERVICE_ADDED = "SERVICE_ADDED",
  SERVICE_REMOVED = "SERVICE_REMOVED",
}

export interface Incident {
  id: number;
  incidentNumber?: string;
  title: string;
  description?: string;
  severity: Severity;
  severityLabel?: string;
  impact?: IncidentImpact;
  impactLabel?: string;
  status: IncidentStatus;
  statusLabel?: string;
  serviceId: number;
  serviceName?: string;
  ticketId?: number;
  ticketNumber?: string;

  // Multi-tickets
  ticketIds?: number[];
  ticketNumbers?: string[];

  // Affected services
  affectedServiceIds?: number[];
  affectedServiceNames?: string[];

  // Commander
  commanderId?: number;
  commanderName?: string;

  // Post-mortem
  postMortem?: string;
  postMortemAt?: string;
  hasPostMortem?: boolean;

  // Timeline
  timelineCount?: number;

  startedAt: string;
  resolvedAt?: string;
  cause?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IncidentRequest {
  title: string;
  description?: string;
  severity: Severity;
  impact?: IncidentImpact;
  status?: IncidentStatus;
  serviceId: number;
  ticketId?: number;
  ticketIds?: number[];
  affectedServiceIds?: number[];
  commanderId?: number;
  startedAt: string;
  resolvedAt?: string;
  cause?: string;
}

export interface IncidentTimelineEntry {
  id: number;
  eventType: IncidentTimelineEventType;
  eventTypeLabel?: string;
  content?: string;
  oldValue?: string;
  newValue?: string;
  authorId?: number;
  authorName?: string;
  createdAt: string;
}

export interface ServiceStatusHistoryEntry {
  id: number;
  serviceId: number;
  oldStatus: ServiceStatus | string;
  oldStatusLabel?: string;
  newStatus: ServiceStatus | string;
  newStatusLabel?: string;
  changedById?: number;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

export const IncidentStatusLabels: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: "Ouvert",
  [IncidentStatus.IN_PROGRESS]: "En cours",
  [IncidentStatus.RESOLVED]: "Résolu",
  [IncidentStatus.CLOSED]: "Fermé",
};

export const IncidentStatusColors: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: "#ef4444",
  [IncidentStatus.IN_PROGRESS]: "#f97316",
  [IncidentStatus.RESOLVED]: "#22c55e",
  [IncidentStatus.CLOSED]: "#6b7280",
};

export const SeverityLabels: Record<Severity, string> = {
  [Severity.CRITICAL]: "Critique",
  [Severity.MAJOR]: "Majeur",
  [Severity.MINOR]: "Mineur",
  [Severity.LOW]: "Faible",
};

export const SeverityColors: Record<Severity, string> = {
  [Severity.CRITICAL]: "#dc2626",
  [Severity.MAJOR]: "#ea580c",
  [Severity.MINOR]: "#ca8a04",
  [Severity.LOW]: "#16a34a",
};

export const ImpactLabels: Record<IncidentImpact, string> = {
  [IncidentImpact.LOCALIZED]: "Localisé",
  [IncidentImpact.PARTIAL]: "Partiel",
  [IncidentImpact.MAJOR]: "Majeur",
  [IncidentImpact.TOTAL]: "Total",
};

export const CriticalityLabels: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

// =============================================================================
// AUDIT LOG TYPES (Enhanced for V30 audit_logs schema)
// =============================================================================

/**
 * AuditLog - Enhanced audit log entry with old/new values, metadata, user-agent.
 *
 * Used in:
 * - AuditLogPage (admin full audit table)
 * - TicketDetailPage "Historique" tab
 * - ServiceDetailPage change timeline
 * - UserDetailPage action history
 */
export interface AuditLog {
  id: number;
  timestamp: string; // ISO 8601 format
  userName?: string | null;
  userEmail?: string | null;
  userId?: number | null;
  action: string; // TICKET_CREATED, SERVICE_UPDATED, etc.
  actionLabel?: string; // Human-readable French label
  actionCategory?: string; // "Tickets", "Services", "Utilisateurs", etc.
  entityType: string; // TICKET, SERVICE, CLIENT, USER, etc.
  entityId: number;
  entityName?: string | null; // e.g., "Ticket #123", "Service Fibre FTTH"
  description: string; // Human-readable description
  oldValue?: string | null; // JSON or plain text
  newValue?: string | null; // JSON or plain text
  ipAddress?: string | null;
  userAgent?: string | null;
  systemAction: boolean; // True if performed by system (no user)
}

/**
 * AuditLogEntry (legacy type, kept for backward compatibility).
 * @deprecated Use AuditLog instead
 */
export interface AuditLogEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  userId?: number;
  userEmail?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

/**
 * AuditLogSearchParams - Search criteria for audit log advanced search.
 * All fields are optional (null means "no filter").
 */
export interface AuditLogSearchParams {
  userId?: number;
  entityType?: string;
  action?: string; // AuditAction enum value
  startDate?: string; // ISO 8601 timestamp
  endDate?: string; // ISO 8601 timestamp
  ipAddress?: string;
  entityId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
}

// =============================================================================
// SLA HEATMAP / KPI (frontend display)
// =============================================================================

export interface SlaHeatmapDay {
  date: string;
  complianceRate: number;
  totalTickets: number;
  breachedCount: number;
  atRiskCount?: number;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/** Réponse API / WebSocket pour une notification. */
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  typeLabel?: string;
  referenceType?: string;
  referenceId?: number;
  referencePath?: string;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
  isUrgent?: boolean;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: "ASC" | "DESC";
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// =============================================================================
// API ERROR TYPES
// =============================================================================

/** Legacy error format (kept for compatibility). */
export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  validationErrors?: Record<string, string>;
}

/** RFC 7807 Problem Details – standard error format from backend. */
export interface ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  timestamp?: string;
  properties?: {
    validationErrors?: Record<string, string>;
    traceId?: string;
    retryAfterSeconds?: number;
    [key: string]: unknown;
  };
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

export interface AuthProps {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  user?: UserResponse;
  setUser?: Dispatch<SetStateAction<UserResponse | undefined>>;
}

/** Filtre SLA: OK = dans les temps, AT_RISK = à risque, BREACHED = dépassé */
export type SlaStatusFilter = "OK" | "AT_RISK" | "BREACHED";

export interface TicketFilterParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  clientId?: number;
  serviceId?: number;
  assignedToId?: number;
  search?: string;
  /** Déprécié: préférer slaStatus */
  breachedSla?: boolean;
  slaStatus?: SlaStatusFilter;
  fromDate?: string;
  toDate?: string;
}

// =============================================================================
// QUICK REPLY / MACRO TEMPLATES
// =============================================================================

/** Catégorie de template de réponse rapide */
export type QuickReplyCategory =
  | "accuse"
  | "info"
  | "resolution"
  | "cloture"
  | "escalade"
  | "custom";

/** Template de réponse rapide (macro) pour les agents */
export interface QuickReplyTemplate {
  id: number;
  name: string;
  content: string;
  category: QuickReplyCategory;
  /** Variables substituables: {client}, {ticketId}, {service}, {agent}, {date} */
  variables: string[];
  roleAllowed?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyTemplateRequest {
  name: string;
  content: string;
  category: QuickReplyCategory;
  variables?: string[];
  roleAllowed?: string | null;
}

/** Vue sauvegardée pour la liste tickets */
export interface SavedView {
  key: string;
  label: string;
  icon?: string;
  filters: TicketFilterParams;
  count?: number;
}

// =============================================================================
// SLA POLICIES (Politiques de niveau de service)
// =============================================================================

export enum SlaPolicyPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export interface SlaPolicy {
  id: number;
  name: string;
  description?: string;
  priority: SlaPolicyPriority;
  responseTimeHours: number; // Délai de première réponse
  resolutionTimeHours: number; // Délai de résolution
  businessHoursId?: number | null;
  businessHoursName?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SlaPolicyRequest {
  name: string;
  description?: string;
  priority: SlaPolicyPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
  businessHoursId?: number | null;
  active?: boolean;
}

// =============================================================================
// SLA ESCALATION TYPES
// =============================================================================

/** KPI stats returned by /api/sla-escalation/stats */
export interface SlaEscalationStats {
  complianceRate: number;
  atRiskCount: number;
  breachedCount: number;
  activeCount: number;
  escalatedCount: number;
  activeRulesCount: number;
  averageResolutionHours: number;
}

/** Trigger type for an escalation rule */
export type EscalationTriggerType = "AT_RISK" | "BREACHED";

/** An escalation rule from /api/sla-escalation/rules */
export interface EscalationRule {
  id: number;
  name: string;
  description?: string;
  triggerType: EscalationTriggerType;
  thresholdPercent: number;
  escalationLevel: number;
  autoAssignToId?: number | null;
  autoAssignToName?: string;
  notifyRoles?: string;
  changePriority?: string;
  enabled: boolean;
  priorityFilter?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

/** Request body for creating/updating an escalation rule */
export interface EscalationRuleRequest {
  name: string;
  description?: string;
  triggerType: EscalationTriggerType;
  thresholdPercent: number;
  escalationLevel: number;
  autoAssignToId?: number | null;
  notifyRoles?: string;
  changePriority?: string;
  enabled?: boolean;
  priorityFilter?: string;
  sortOrder?: number;
}

/** SLA timeline event types */
export type SlaTimelineEventType =
  | "STARTED"
  | "PAUSED"
  | "RESUMED"
  | "BREACHED"
  | "AT_RISK"
  | "ESCALATED"
  | "DEADLINE_CHANGED";

/** A timeline event from /api/sla-escalation/timeline/:ticketId */
export interface SlaTimelineEvent {
  id: number;
  ticketId: number;
  eventType: SlaTimelineEventType;
  oldValue?: string;
  newValue?: string;
  details?: string;
  pausedMinutes?: number;
  createdAt: string;
}

/** Business hours configuration */
export interface BusinessHours {
  id: number;
  name: string;
  startHour: number;
  endHour: number;
  workDays: string;
  timezone: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** Request body for creating/updating business hours */
export interface BusinessHoursRequest {
  name: string;
  startHour: number;
  endHour: number;
  workDays: string;
  timezone?: string;
  isDefault?: boolean;
  active?: boolean;
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

export const StatusColors: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: "#2C8DB6",
  [TicketStatus.ASSIGNED]: "#3FA7D6",
  [TicketStatus.IN_PROGRESS]: "#3b82f6",
  [TicketStatus.PENDING]: "#f59e0b",
  [TicketStatus.PENDING_THIRD_PARTY]: "#f97316",
  [TicketStatus.ESCALATED]: "#ef4444",
  [TicketStatus.RESOLVED]: "#10b981",
  [TicketStatus.CLOSED]: "#6b7280",
  [TicketStatus.CANCELLED]: "#9ca3af",
};

export const PriorityColors: Record<TicketPriority, string> = {
  [TicketPriority.CRITICAL]: "#dc2626",
  [TicketPriority.HIGH]: "#f97316",
  [TicketPriority.MEDIUM]: "#eab308",
  [TicketPriority.LOW]: "#22c55e",
};

export const StatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: "Nouveau",
  [TicketStatus.ASSIGNED]: "Assigné",
  [TicketStatus.IN_PROGRESS]: "En cours",
  [TicketStatus.PENDING]: "En attente client",
  [TicketStatus.PENDING_THIRD_PARTY]: "En attente tiers",
  [TicketStatus.ESCALATED]: "Escaladé",
  [TicketStatus.RESOLVED]: "Résolu",
  [TicketStatus.CLOSED]: "Fermé",
  [TicketStatus.CANCELLED]: "Annulé",
};

export const PriorityLabels: Record<TicketPriority, string> = {
  [TicketPriority.CRITICAL]: "Critique",
  [TicketPriority.HIGH]: "Haute",
  [TicketPriority.MEDIUM]: "Moyenne",
  [TicketPriority.LOW]: "Basse",
};

export const CategoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.PANNE]: "Panne",
  [TicketCategory.DEMANDE]: "Demande",
  [TicketCategory.EVOLUTION]: "Évolution",
  [TicketCategory.AUTRE]: "Autre",
};

export const RoleLabels: Record<UserRole, string> = {
  [UserRole.CLIENT]: "Client",
  [UserRole.AGENT]: "Agent",
  [UserRole.MANAGER]: "Manager",
  [UserRole.ADMIN]: "Administrateur",
};

export const ServiceStatusLabels: Record<ServiceStatus, string> = {
  [ServiceStatus.UP]: "Opérationnel",
  [ServiceStatus.DEGRADED]: "Dégradé",
  [ServiceStatus.DOWN]: "Panne",
  [ServiceStatus.MAINTENANCE]: "Maintenance",
};

export const ServiceStatusColors: Record<ServiceStatus, string> = {
  [ServiceStatus.UP]: "text-green-700 dark:text-green-400",
  [ServiceStatus.DEGRADED]: "text-amber-700 dark:text-amber-400",
  [ServiceStatus.DOWN]: "text-red-700 dark:text-red-400",
  [ServiceStatus.MAINTENANCE]: "text-slate-600 dark:text-slate-400",
};

export const ServiceStatusBgColors: Record<ServiceStatus, string> = {
  [ServiceStatus.UP]: "bg-green-100 dark:bg-green-900/40",
  [ServiceStatus.DEGRADED]: "bg-amber-100 dark:bg-amber-900/40",
  [ServiceStatus.DOWN]: "bg-red-100 dark:bg-red-900/40",
  [ServiceStatus.MAINTENANCE]: "bg-slate-100 dark:bg-slate-700",
};
