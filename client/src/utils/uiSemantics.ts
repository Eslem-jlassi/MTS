import type { BadgeVariant } from "../components/ui/Badge";
import { designTokens } from "../theme";
import {
  IncidentStatus,
  PriorityLabels,
  ServiceStatus,
  StatusLabels,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "../types";

export type SemanticTone = "neutral" | "info" | "success" | "warning" | "danger" | "ai";

type SemanticStyle = {
  badgeVariant: BadgeVariant;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: string;
  softPanel: string;
  solid: string;
};

const semanticStyles: Record<SemanticTone, SemanticStyle> = {
  neutral: {
    badgeVariant: "neutral",
    bg: "bg-ds-elevated dark:bg-ds-elevated/70",
    text: "text-ds-secondary dark:text-ds-secondary",
    border: "border-ds-border dark:border-ds-border",
    dot: "bg-ds-muted",
    icon: "bg-ds-elevated text-ds-secondary dark:bg-ds-elevated/70 dark:text-ds-secondary",
    softPanel: "border-ds-border bg-ds-surface text-ds-secondary dark:bg-ds-elevated/55",
    solid: "bg-ds-muted text-white",
  },
  info: {
    badgeVariant: "info",
    bg: "bg-info-50 dark:bg-info-500/12",
    text: "text-info-700 dark:text-info-200",
    border: "border-info-200 dark:border-info-500/20",
    dot: "bg-info-500",
    icon: "bg-info-50 text-info-600 dark:bg-info-500/12 dark:text-info-300",
    softPanel: "border-info-200 bg-info-50/90 text-info-700 dark:border-info-500/20 dark:bg-info-500/10 dark:text-info-200",
    solid: "bg-info-500 text-white",
  },
  success: {
    badgeVariant: "success",
    bg: "bg-success-50 dark:bg-success-500/12",
    text: "text-success-700 dark:text-success-200",
    border: "border-success-200 dark:border-success-500/20",
    dot: "bg-success-500",
    icon:
      "bg-success-50 text-success-600 dark:bg-success-500/12 dark:text-success-300",
    softPanel:
      "border-success-200 bg-success-50/90 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-200",
    solid: "bg-success-500 text-white",
  },
  warning: {
    badgeVariant: "warning",
    bg: "bg-warning-50 dark:bg-warning-500/12",
    text: "text-warning-700 dark:text-warning-200",
    border: "border-warning-200 dark:border-warning-500/20",
    dot: "bg-warning-500",
    icon:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/12 dark:text-warning-300",
    softPanel:
      "border-warning-200 bg-warning-50/90 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-200",
    solid: "bg-warning-500 text-white",
  },
  danger: {
    badgeVariant: "danger",
    bg: "bg-error-50 dark:bg-error-500/12",
    text: "text-error-700 dark:text-error-200",
    border: "border-error-200 dark:border-error-500/20",
    dot: "bg-error-500",
    icon: "bg-error-50 text-error-600 dark:bg-error-500/12 dark:text-error-300",
    softPanel:
      "border-error-200 bg-error-50/90 text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-200",
    solid: "bg-error-500 text-white",
  },
  ai: {
    badgeVariant: "ai",
    bg: "bg-ai-50 dark:bg-ai-500/12",
    text: "text-ai-700 dark:text-ai-200",
    border: "border-ai-200 dark:border-ai-500/20",
    dot: "bg-ai-500",
    icon: "bg-ai-50 text-ai-600 dark:bg-ai-500/12 dark:text-ai-300",
    softPanel:
      "border-ai-200 bg-ai-50/90 text-ai-700 dark:border-ai-500/20 dark:bg-ai-500/10 dark:text-ai-200",
    solid: "bg-ai-500 text-white",
  },
};

export const toneBadgeVariant = (tone: SemanticTone): BadgeVariant => semanticStyles[tone].badgeVariant;
export const toneBgClass = (tone: SemanticTone): string => semanticStyles[tone].bg;
export const toneTextClass = (tone: SemanticTone): string => semanticStyles[tone].text;
export const toneBorderClass = (tone: SemanticTone): string => semanticStyles[tone].border;
export const toneDotClass = (tone: SemanticTone): string => semanticStyles[tone].dot;
export const toneIconClass = (tone: SemanticTone): string => semanticStyles[tone].icon;
export const toneSoftPanelClass = (tone: SemanticTone): string => semanticStyles[tone].softPanel;
export const toneSolidClass = (tone: SemanticTone): string => semanticStyles[tone].solid;

export const toneHex: Record<SemanticTone, string> = {
  neutral: designTokens.colors.textMuted,
  info: designTokens.colors.info,
  success: designTokens.colors.success,
  warning: designTokens.colors.warning,
  danger: designTokens.colors.danger,
  ai: designTokens.colors.ai,
};

export const ticketPriorityTone: Record<TicketPriority, SemanticTone> = {
  [TicketPriority.CRITICAL]: "danger",
  [TicketPriority.HIGH]: "warning",
  [TicketPriority.MEDIUM]: "info",
  [TicketPriority.LOW]: "success",
};

export const ticketStatusTone: Record<TicketStatus, SemanticTone> = {
  [TicketStatus.NEW]: "info",
  [TicketStatus.ASSIGNED]: "ai",
  [TicketStatus.IN_PROGRESS]: "info",
  [TicketStatus.PENDING]: "warning",
  [TicketStatus.PENDING_THIRD_PARTY]: "warning",
  [TicketStatus.ESCALATED]: "danger",
  [TicketStatus.RESOLVED]: "success",
  [TicketStatus.CLOSED]: "neutral",
  [TicketStatus.CANCELLED]: "neutral",
};

export const ticketPriorityVisuals = Object.fromEntries(
  Object.entries(ticketPriorityTone).map(([key, tone]) => [
    key,
    {
      label: PriorityLabels[key as TicketPriority],
      tone,
      ...semanticStyles[tone],
    },
  ]),
) as Record<TicketPriority, { label: string; tone: SemanticTone } & SemanticStyle>;

export const ticketStatusVisuals = Object.fromEntries(
  Object.entries(ticketStatusTone).map(([key, tone]) => [
    key,
    {
      label: StatusLabels[key as TicketStatus],
      tone,
      ...semanticStyles[tone],
    },
  ]),
) as Record<TicketStatus, { label: string; tone: SemanticTone } & SemanticStyle>;

export const roleTone: Record<UserRole, SemanticTone> = {
  [UserRole.CLIENT]: "info",
  [UserRole.AGENT]: "success",
  [UserRole.MANAGER]: "ai",
  [UserRole.ADMIN]: "danger",
};

export const roleVisuals = Object.fromEntries(
  Object.entries(roleTone).map(([key, tone]) => [
    key,
    {
      label: key === UserRole.ADMIN ? "Admin" : key.charAt(0) + key.slice(1).toLowerCase(),
      tone,
      ...semanticStyles[tone],
    },
  ]),
) as Record<UserRole, { label: string; tone: SemanticTone } & SemanticStyle>;

export const auditEntityTone: Record<string, SemanticTone> = {
  USER: "info",
  TICKET: "success",
  SERVICE: "ai",
  SLA: "warning",
  INCIDENT: "danger",
  CLIENT: "neutral",
  CATEGORY: "info",
};

export const serviceStatusTone: Record<ServiceStatus, SemanticTone> = {
  [ServiceStatus.UP]: "success",
  [ServiceStatus.DEGRADED]: "warning",
  [ServiceStatus.DOWN]: "danger",
  [ServiceStatus.MAINTENANCE]: "neutral",
};

export const incidentStatusTone: Record<IncidentStatus, SemanticTone> = {
  [IncidentStatus.OPEN]: "danger",
  [IncidentStatus.IN_PROGRESS]: "warning",
  [IncidentStatus.RESOLVED]: "success",
  [IncidentStatus.CLOSED]: "neutral",
};

export type SlaLikeTicket = {
  breachedSla?: boolean;
  overdue?: boolean;
  slaWarning?: boolean;
};

export const getSlaTone = (ticket?: SlaLikeTicket | null): SemanticTone => {
  if (!ticket) {
    return "neutral";
  }

  if (ticket.breachedSla || ticket.overdue) {
    return "danger";
  }

  if (ticket.slaWarning) {
    return "warning";
  }

  return "success";
};
