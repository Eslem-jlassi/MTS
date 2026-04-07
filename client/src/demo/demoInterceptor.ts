// =============================================================================
// MTS TELECOM - Demo Mode Interceptor (Axios)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================
//
// OBJECTIF:
// Intercepter les requetes Axios en mode demo et retourner
// des donnees mock realistes pour les routes explicitement simulees.
// Toute route non declaree remonte une erreur visible afin de ne pas
// masquer un endpoint manquant ou un contrat API casse.
//
// FONCTIONNEMENT:
// 1. installDemoInterceptor(axiosInstance) enregistre un request interceptor
// 2. Chaque requÃªte est comparÃ©e Ã  une table de routes
// 3. Si un match est trouvÃ©, on retourne immÃ©diatement une AxiosResponse mock
// 4. Un dÃ©lai artificiel (DEMO_LATENCY_MS) simule le rÃ©seau
//
// AVANTAGE:
// ZÃ©ro modification dans les services API existants.
// Le code de production reste intact.
//
// =============================================================================

import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { DEMO_LATENCY_MS, DEMO_REFRESH_TOKEN, DEMO_TOKEN, DEMO_USER } from "./demoConfig";
import {
  DEMO_TICKETS,
  DEMO_INCIDENTS,
  DEMO_SERVICES,
  DEMO_USERS,
  DEMO_CLIENTS,
  DEMO_AUDIT_LOGS,
  DEMO_NOTIFICATIONS,
  DEMO_SLA_POLICIES,
  DEMO_AGENT_PERFORMANCE,
  DEMO_DASHBOARD_STATS,
} from "./demoData";
import type { PageResponse } from "../types";

// =============================================================================
// HELPERS
// =============================================================================

/** Simule un dÃ©lai rÃ©seau */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Construit une PageResponse<T> Ã  partir d'un array complet */
function toPage<T>(items: T[], pageNum = 0, pageSize = 20): PageResponse<T> {
  const start = pageNum * pageSize;
  const content = items.slice(start, start + pageSize);
  return {
    content,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / pageSize),
    size: pageSize,
    number: pageNum,
    first: pageNum === 0,
    last: start + pageSize >= items.length,
    empty: content.length === 0,
  };
}

/** Fabrique une AxiosResponse factice */
function fakeResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status >= 400 ? "ERROR" : "OK",
    headers: { "content-type": "application/json" },
    config: {} as InternalAxiosRequestConfig,
  };
}

/** Parse le body JSON si present */
function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (!config.data) {
    return {};
  }

  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof config.data === "object") {
    return config.data as Record<string, unknown>;
  }

  return {};
}

/** Genere une erreur explicite si une route n'est pas mockee en mode demo */
function buildUnmockedRouteError(
  method: HttpMethod,
  url: string,
  config: InternalAxiosRequestConfig,
): AxiosError {
  const response = fakeResponse(
    {
      type: "https://mts-telecom.local/problems/demo-route-not-mocked",
      title: "Route non simulee en mode demo",
      status: 501,
      detail: `La route ${method.toUpperCase()} ${url} n'est pas prise en charge par le mode demonstration explicite. Desactivez REACT_APP_DEMO_MODE pour tester l'API reelle.`,
      properties: {
        demoMode: true,
        route: `${method.toUpperCase()} ${url}`,
      },
    },
    501,
  );

  return new AxiosError(
    `Unmocked demo route: ${method.toUpperCase()} ${url}`,
    "ERR_DEMO_ROUTE_NOT_MOCKED",
    config,
    undefined,
    response,
  );
}

/** Extrait l'id numÃ©rique d'un segment de path (ex: "/tickets/42" â†’ 42) */
function extractId(url: string, prefix: string): number | null {
  // Matches: /prefix/123 or /prefix/123/...
  const regex = new RegExp(`${prefix}/(\\d+)`);
  const m = url.match(regex);
  return m ? parseInt(m[1], 10) : null;
}

/** Extraction page/size des query params */
function extractPageParams(config: InternalAxiosRequestConfig): { page: number; size: number } {
  const params = config.params || {};
  return {
    page: parseInt(params.page ?? "0", 10),
    size: parseInt(params.size ?? "20", 10),
  };
}

// =============================================================================
// ROUTE MATCHER
// =============================================================================

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface DemoRoute {
  method: HttpMethod;
  /** Regex pattern Ã  tester sur l'URL (sans baseURL) */
  pattern: RegExp;
  /** Handler retournant les donnÃ©es mock */
  handler: (url: string, config: InternalAxiosRequestConfig) => unknown;
}

/**
 * Table de routage dÃ©mo.
 * Chaque route intercepte un endpoint spÃ©cifique.
 * L'ordre est important : les patterns plus prÃ©cis viennent en premier.
 */
const DEMO_ROUTES: DemoRoute[] = [
  // ===========================================================================
  // AUTH
  // ===========================================================================
  {
    method: "post",
    pattern: /\/auth\/login$/,
    handler: () => ({
      accessToken: DEMO_TOKEN,
      refreshToken: DEMO_REFRESH_TOKEN,
      user: DEMO_USER,
    }),
  },
  {
    method: "post",
    pattern: /\/auth\/register$/,
    handler: () => ({
      accessToken: DEMO_TOKEN,
      refreshToken: DEMO_REFRESH_TOKEN,
      user: DEMO_USER,
    }),
  },
  {
    method: "post",
    pattern: /\/auth\/register\/admin$/,
    handler: () => ({
      tokenType: "Cookie",
      user: {
        ...DEMO_USER,
        role: "CLIENT",
      },
    }),
  },
  {
    method: "post",
    pattern: /\/auth\/google$/,
    handler: () => ({
      accessToken: DEMO_TOKEN,
      refreshToken: DEMO_REFRESH_TOKEN,
      user: DEMO_USER,
    }),
  },
  {
    method: "get",
    pattern: /\/auth\/me$/,
    handler: () => DEMO_USER,
  },
  {
    method: "get",
    pattern: /\/users\/me$/,
    handler: () => DEMO_USER,
  },
  {
    method: "put",
    pattern: /\/auth\/me$/,
    handler: () => DEMO_USER,
  },
  {
    method: "put",
    pattern: /\/users\/me$/,
    handler: () => DEMO_USER,
  },
  {
    method: "post",
    pattern: /\/auth\/logout$/,
    handler: () => ({}),
  },
  {
    method: "post",
    pattern: /\/auth\/change-password$/,
    handler: () => ({}),
  },
  {
    method: "put",
    pattern: /\/users\/me\/change-password$/,
    handler: () => ({ success: true }),
  },
  {
    method: "post",
    pattern: /\/users\/me\/avatar$/,
    handler: () => DEMO_USER,
  },
  {
    method: "post",
    pattern: /\/auth\/refresh$/,
    handler: () => ({
      accessToken: DEMO_TOKEN,
      refreshToken: DEMO_REFRESH_TOKEN,
    }),
  },
  {
    method: "post",
    pattern: /\/auth\/forgot-password$/,
    handler: () => ({ success: true }),
  },
  {
    method: "post",
    pattern: /\/auth\/reset-password$/,
    handler: () => ({ success: true }),
  },
  {
    method: "get",
    pattern: /\/auth\/verify-email$/,
    handler: () => ({ success: true }),
  },
  {
    method: "post",
    pattern: /\/auth\/resend-verification$/,
    handler: () => ({ success: true }),
  },

  // ===========================================================================
  // DASHBOARD
  // ===========================================================================
  {
    method: "get",
    pattern: /\/dashboard\/stats$/,
    handler: () => DEMO_DASHBOARD_STATS,
  },
  {
    method: "get",
    pattern: /\/dashboard\/my-stats$/,
    handler: () => DEMO_DASHBOARD_STATS,
  },
  {
    method: "get",
    pattern: /\/dashboard\/agent-performance$/,
    handler: () => DEMO_AGENT_PERFORMANCE,
  },

  // ===========================================================================
  // TICKETS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/tickets\/my-tickets/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      const myTickets = DEMO_TICKETS.filter((t) => t.clientId === DEMO_USER.id);
      return toPage(myTickets, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/tickets\/assigned/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      const assigned = DEMO_TICKETS.filter((t) => t.assignedToId === DEMO_USER.id);
      return toPage(assigned, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/tickets\/unassigned/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      const unassigned = DEMO_TICKETS.filter((t) => !t.assignedToId);
      return toPage(unassigned, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/tickets\/sla-breached/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      const breached = DEMO_TICKETS.filter((t) => t.breachedSla);
      return toPage(breached, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/tickets\/export\/(csv|excel|pdf)/,
    handler: () => new Blob(["Demo export data"], { type: "text/plain" }),
  },
  {
    method: "get",
    pattern: /\/tickets\/number\/.+/,
    handler: (url) => {
      const num = url.split("/tickets/number/")[1];
      return DEMO_TICKETS.find((t) => t.ticketNumber === num) || DEMO_TICKETS[0];
    },
  },
  {
    method: "get",
    pattern: /\/tickets\/\d+\/comments/,
    handler: () => [],
  },
  {
    method: "get",
    pattern: /\/tickets\/\d+\/history/,
    handler: () => [],
  },
  {
    method: "get",
    pattern: /\/tickets\/\d+\/attachments\/\d+\/download/,
    handler: () => new Blob(["Demo file"], { type: "application/octet-stream" }),
  },
  {
    method: "get",
    pattern: /\/tickets\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/tickets");
      return DEMO_TICKETS.find((t) => t.id === id) || DEMO_TICKETS[0];
    },
  },
  {
    method: "get",
    pattern: /\/tickets(\?|$)/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_TICKETS, page, size);
    },
  },
  {
    method: "post",
    pattern: /\/tickets\/\d+\/status/,
    handler: (url) => {
      const id = extractId(url, "/tickets");
      return DEMO_TICKETS.find((t) => t.id === id) || DEMO_TICKETS[0];
    },
  },
  {
    method: "post",
    pattern: /\/tickets\/\d+\/assign/,
    handler: (url) => {
      const id = extractId(url, "/tickets");
      const ticket = DEMO_TICKETS.find((t) => t.id === id) || DEMO_TICKETS[0];
      return { ...ticket, assignedToId: 3, assignedToName: "Karim Ziani" };
    },
  },
  {
    method: "post",
    pattern: /\/tickets\/\d+\/comments/,
    handler: (url, config) => {
      const id = extractId(url, "/tickets");
      const ticket = DEMO_TICKETS.find((t) => t.id === id) || DEMO_TICKETS[0];
      const body = parseBody(config);
      const newComment = {
        id: 999,
        ticketId: ticket.id,
        content:
          typeof body.content === "string" && body.content.trim()
            ? body.content.trim()
            : "Commentaire de suivi ajoute dans le mode demonstration.",
        authorId: DEMO_USER.id,
        authorName: DEMO_USER.fullName,
        authorRole: DEMO_USER.role,
        isInternal: false,
        createdAt: new Date().toISOString(),
      };

      return {
        ...ticket,
        comments: [...(ticket.comments ?? []), newComment],
        commentCount: (ticket.commentCount ?? ticket.comments?.length ?? 0) + 1,
      };
    },
  },
  {
    method: "post",
    pattern: /\/tickets\/\d+\/apply-macro/,
    handler: (url) => {
      const id = extractId(url, "/tickets");
      return DEMO_TICKETS.find((t) => t.id === id) || DEMO_TICKETS[0];
    },
  },
  {
    method: "post",
    pattern: /\/tickets\/bulk\/(assign|status|priority)/,
    handler: () => ({ successCount: 3, failureCount: 0, errors: [] }),
  },
  {
    method: "post",
    pattern: /\/tickets$/,
    handler: () => ({
      ...DEMO_TICKETS[0],
      id: 999,
      ticketNumber: "TKT-2026-00999",
      title: "Incident telecom en qualification",
      createdAt: new Date().toISOString(),
    }),
  },
  {
    method: "put",
    pattern: /\/tickets\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/tickets");
      return DEMO_TICKETS.find((t) => t.id === id) || DEMO_TICKETS[0];
    },
  },

  // ===========================================================================
  // INCIDENTS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/incidents\/active$/,
    handler: () => DEMO_INCIDENTS.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED"),
  },
  {
    method: "get",
    pattern: /\/incidents\/filter/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_INCIDENTS, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/incidents\/service\/\d+/,
    handler: (url, c) => {
      const svcId = extractId(url, "/incidents/service");
      const { page, size } = extractPageParams(c);
      const filtered = DEMO_INCIDENTS.filter((i) => i.serviceId === svcId);
      return toPage(filtered, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/incidents\/affected-service\/\d+/,
    handler: (url) => {
      const svcId = extractId(url, "/incidents/affected-service");
      return DEMO_INCIDENTS.filter((i) => i.affectedServiceIds?.includes(svcId!));
    },
  },
  {
    method: "get",
    pattern: /\/incidents\/\d+\/timeline/,
    handler: () => [
      {
        id: 1,
        type: "NOTE",
        message: "Incident cree",
        createdAt: new Date().toISOString(),
        authorName: "Systeme",
      },
    ],
  },
  {
    method: "get",
    pattern: /\/incidents\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/incidents");
      return DEMO_INCIDENTS.find((i) => i.id === id) || DEMO_INCIDENTS[0];
    },
  },
  {
    method: "get",
    pattern: /\/incidents(\?|$)/,
    handler: () => DEMO_INCIDENTS,
  },
  {
    method: "post",
    pattern: /\/incidents$/,
    handler: () => ({
      ...DEMO_INCIDENTS[0],
      id: 999,
      incidentNumber: "INC-2026-00999",
      title: "Incident telecom en cours de qualification",
    }),
  },
  {
    method: "put",
    pattern: /\/incidents\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/incidents");
      return DEMO_INCIDENTS.find((i) => i.id === id) || DEMO_INCIDENTS[0];
    },
  },
  {
    method: "patch",
    pattern: /\/incidents\/\d+\/status/,
    handler: (url) => {
      const id = extractId(url, "/incidents");
      return DEMO_INCIDENTS.find((i) => i.id === id) || DEMO_INCIDENTS[0];
    },
  },
  {
    method: "post",
    pattern: /\/incidents\/\d+\/(close|notes|post-mortem|tickets|services)/,
    handler: (url) => {
      const id = extractId(url, "/incidents");
      return DEMO_INCIDENTS.find((i) => i.id === id) || DEMO_INCIDENTS[0];
    },
  },

  // ===========================================================================
  // SERVICES TELECOM
  // ===========================================================================
  {
    method: "get",
    pattern: /\/services\/active$/,
    handler: () => DEMO_SERVICES.filter((s) => s.isActive),
  },
  {
    method: "get",
    pattern: /\/services\/health$/,
    handler: () => DEMO_SERVICES,
  },
  {
    method: "get",
    pattern: /\/services\/category\/.+/,
    handler: (url) => {
      const cat = url.split("/services/category/")[1];
      return DEMO_SERVICES.filter((s) => s.category === cat);
    },
  },
  {
    method: "get",
    pattern: /\/services\/\d+\/status-history(\/recent)?/,
    handler: () => [
      { id: 1, status: "UP", timestamp: new Date().toISOString(), changedBy: "Systeme" },
    ],
  },
  {
    method: "get",
    pattern: /\/services\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/services");
      return DEMO_SERVICES.find((s) => s.id === id) || DEMO_SERVICES[0];
    },
  },
  {
    method: "get",
    pattern: /\/services(\?|$)/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_SERVICES, page, size);
    },
  },
  {
    method: "post",
    pattern: /\/services$/,
    handler: () => ({
      ...DEMO_SERVICES[0],
      id: 999,
      name: "Service telecom entreprise en preparation",
    }),
  },
  {
    method: "put",
    pattern: /\/services\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/services");
      return DEMO_SERVICES.find((s) => s.id === id) || DEMO_SERVICES[0];
    },
  },
  {
    method: "patch",
    pattern: /\/services\/\d+\/status/,
    handler: (url) => {
      const id = extractId(url, "/services");
      return DEMO_SERVICES.find((s) => s.id === id) || DEMO_SERVICES[0];
    },
  },
  {
    method: "delete",
    pattern: /\/services\/\d+$/,
    handler: () => ({}),
  },

  // ===========================================================================
  // USERS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/users\/count$/,
    handler: () => ({ count: DEMO_USERS.length }),
  },
  {
    method: "get",
    pattern: /\/users\/agents\/available$/,
    handler: () => DEMO_USERS.filter((u) => u.role === "AGENT" && u.isActive !== false),
  },
  {
    method: "get",
    pattern: /\/users\/role\/.+/,
    handler: (url) => {
      const role = url.split("/users/role/")[1]?.toUpperCase();
      return DEMO_USERS.filter((u) => u.role === role);
    },
  },
  {
    method: "get",
    pattern: /\/users\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/users");
      return DEMO_USERS.find((u) => u.id === id) || DEMO_USERS[0];
    },
  },
  {
    method: "get",
    pattern: /\/users(\?|$)/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_USERS, page, size);
    },
  },
  {
    method: "put",
    pattern: /\/users\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/users");
      return DEMO_USERS.find((u) => u.id === id) || DEMO_USERS[0];
    },
  },
  {
    method: "put",
    pattern: /\/users\/\d+\/role$/,
    handler: (url) => {
      const id = extractId(url, "/users");
      return DEMO_USERS.find((u) => u.id === id) || DEMO_USERS[0];
    },
  },
  {
    method: "post",
    pattern: /\/users\/\d+\/activate$/,
    handler: (url) => {
      const id = extractId(url, "/users");
      return DEMO_USERS.find((u) => u.id === id) || DEMO_USERS[0];
    },
  },
  {
    method: "post",
    pattern: /\/users\/\d+\/deactivate$/,
    handler: (url) => {
      const id = extractId(url, "/users");
      return DEMO_USERS.find((u) => u.id === id) || DEMO_USERS[0];
    },
  },
  {
    method: "post",
    pattern: /\/users\/\d+\/reset-password$/,
    handler: () => ({ success: true }),
  },
  {
    method: "put",
    pattern: /\/users\/\d+\/password$/,
    handler: () => ({ success: true }),
  },
  {
    method: "post",
    pattern: /\/users\/internal$/,
    handler: (_url, config) => {
      const body =
        typeof config.data === "string" && config.data
          ? JSON.parse(config.data)
          : (config.data ?? {});

      return {
        ...DEMO_USERS[0],
        id: Date.now(),
        email: body.email ?? "nouvel.utilisateur@mts.com",
        firstName: body.firstName ?? "Nouveau",
        lastName: body.lastName ?? "Compte",
        fullName: `${body.firstName ?? "Nouveau"} ${body.lastName ?? "Compte"}`,
        phone: body.phone ?? "",
        role: body.role ?? "AGENT",
      };
    },
  },
  {
    method: "get",
    pattern: /\/users\/me\/notification-preferences$/,
    handler: () => ({
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
    }),
  },
  {
    method: "post",
    pattern: /\/users\/me\/notification-preferences$/,
    handler: () => ({ success: true }),
  },
  {
    method: "patch",
    pattern: /\/users\/\d+\/(role|activate|deactivate)/,
    handler: (url) => {
      const id = extractId(url, "/users");
      return DEMO_USERS.find((u) => u.id === id) || DEMO_USERS[0];
    },
  },

  // ===========================================================================
  // CLIENTS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/clients\/search/,
    handler: () => DEMO_CLIENTS,
  },
  {
    method: "get",
    pattern: /\/clients\/code\/.+/,
    handler: (url) => {
      const code = url.split("/clients/code/")[1];
      return DEMO_CLIENTS.find((c) => c.clientCode === code) || DEMO_CLIENTS[0];
    },
  },
  {
    method: "get",
    pattern: /\/clients\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/clients");
      return DEMO_CLIENTS.find((c) => c.id === id) || DEMO_CLIENTS[0];
    },
  },
  {
    method: "get",
    pattern: /\/clients(\?|$)/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_CLIENTS, page, size);
    },
  },
  {
    method: "post",
    pattern: /\/clients$/,
    handler: () => ({ ...DEMO_CLIENTS[0], id: 999, clientCode: "CLI-2026-00999" }),
  },
  {
    method: "put",
    pattern: /\/clients\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/clients");
      return DEMO_CLIENTS.find((c) => c.id === id) || DEMO_CLIENTS[0];
    },
  },

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/notifications\/unread$/,
    handler: () => DEMO_NOTIFICATIONS.filter((n) => !n.isRead),
  },
  {
    method: "get",
    pattern: /\/notifications\/count$/,
    handler: () => ({ count: DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length }),
  },
  {
    method: "get",
    pattern: /\/notifications(\?|$)/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_NOTIFICATIONS, page, size);
    },
  },
  {
    method: "put",
    pattern: /\/notifications\/read-all/,
    handler: () => ({ markedCount: DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length }),
  },
  {
    method: "put",
    pattern: /\/notifications\/\d+\/read/,
    handler: () => ({}),
  },

  // ===========================================================================
  // AUDIT LOGS (prefix = /api/audit-logs dans le service)
  // ===========================================================================
  {
    method: "get",
    pattern: /\/(api\/)?audit-logs\/recent/,
    handler: () => DEMO_AUDIT_LOGS,
  },
  {
    method: "get",
    pattern: /\/(api\/)?audit-logs\/entity\/.+\/\d+/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_AUDIT_LOGS, page, size);
    },
  },
  {
    method: "get",
    pattern: /\/(api\/)?audit-logs\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/audit-logs");
      return DEMO_AUDIT_LOGS.find((a) => a.id === id) || DEMO_AUDIT_LOGS[0];
    },
  },
  {
    method: "get",
    pattern: /\/(api\/)?audit-logs(\?|$)/,
    handler: (_u, c) => {
      const { page, size } = extractPageParams(c);
      return toPage(DEMO_AUDIT_LOGS, page, size);
    },
  },

  // ===========================================================================
  // SLA POLICIES
  // ===========================================================================
  {
    method: "get",
    pattern: /\/sla-policies\/count$/,
    handler: () => ({ count: DEMO_SLA_POLICIES.length }),
  },
  {
    method: "get",
    pattern: /\/sla-policies\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/sla-policies");
      return DEMO_SLA_POLICIES.find((p) => p.id === id) || DEMO_SLA_POLICIES[0];
    },
  },
  {
    method: "get",
    pattern: /\/sla-policies(\?|$)/,
    handler: () => DEMO_SLA_POLICIES,
  },
  {
    method: "post",
    pattern: /\/sla-policies$/,
    handler: () => ({ ...DEMO_SLA_POLICIES[0], id: 999, name: "SLA Renforce Support Entreprise" }),
  },
  {
    method: "put",
    pattern: /\/sla-policies\/\d+$/,
    handler: (url) => {
      const id = extractId(url, "/sla-policies");
      return DEMO_SLA_POLICIES.find((p) => p.id === id) || DEMO_SLA_POLICIES[0];
    },
  },
  {
    method: "delete",
    pattern: /\/sla-policies\/\d+$/,
    handler: () => ({}),
  },

  // ===========================================================================
  // SLA ESCALATION
  // ===========================================================================
  {
    method: "get",
    pattern: /\/sla-escalation\/stats$/,
    handler: () => ({
      complianceRate: 92.8,
      atRiskCount: 2,
      breachedCount: 1,
      activeCount: 5,
      escalatedCount: 1,
      activeRulesCount: 3,
      averageResolutionHours: 6.4,
    }),
  },
  {
    method: "get",
    pattern: /\/sla-escalation\/timeline\/\d+/,
    handler: () => [],
  },
  {
    method: "get",
    pattern: /\/sla-escalation\/rules$/,
    handler: () => [
      {
        id: 1,
        name: "Escalade auto SLA 80%",
        triggerType: "AT_RISK",
        thresholdPercent: 80,
        escalationLevel: 1,
        notifyRoles: "MANAGER",
        enabled: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    method: "post",
    pattern: /\/sla-escalation\/(rules|evaluate)/,
    handler: () => ({ escalatedCount: 1 }),
  },

  // ===========================================================================
  // BUSINESS HOURS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/business-hours(\?|$)/,
    handler: () => [
      {
        id: 1,
        name: "Heures bureau standard",
        startHour: 8,
        endHour: 18,
        workDays: "MON,TUE,WED,THU,FRI",
        timezone: "Europe/Paris",
        isDefault: true,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    method: "get",
    pattern: /\/business-hours\/\d+$/,
    handler: () => ({
      id: 1,
      name: "Heures bureau standard",
      startHour: 8,
      endHour: 18,
      workDays: "MON,TUE,WED,THU,FRI",
      timezone: "Europe/Paris",
      isDefault: true,
      active: true,
      createdAt: new Date().toISOString(),
    }),
  },

  // ===========================================================================
  // MACROS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/macros(\?|$)/,
    handler: () => [
      {
        id: 1,
        name: "Accuse de reception",
        content: "Bonjour {client}, votre ticket {ticketId} a bien ete recu.",
        category: "accuse",
        variables: ["client", "ticketId"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Resolution standard",
        content: "Le probleme a ete resolu. N'hesitez pas a rouvrir ce ticket si necessaire.",
        category: "resolution",
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },

  // ===========================================================================
  // REPORTS
  // ===========================================================================
  {
    method: "get",
    pattern: /\/reports\/all/,
    handler: () => ({
      reports: [
        {
          id: 1,
          title: "Rapport executif de supervision",
          type: "SLA",
          status: "published",
          format: "PDF",
          generatedAt: new Date().toISOString(),
          size: 245000,
          createdByName: "Mohammed Benali",
        },
      ],
      totalElements: 1,
    }),
  },
  {
    method: "get",
    pattern: /\/reports\/search/,
    handler: () => ({ reports: [], totalElements: 0 }),
  },
  {
    method: "post",
    pattern: /\/reports\/generate/,
    handler: () => ({
      id: 999,
      title: "Rapport executif de supervision",
      type: "GENERAL",
      status: "generated",
      format: "PDF",
      generatedAt: new Date().toISOString(),
      size: 100000,
      createdByName: DEMO_USER.fullName,
    }),
  },
];

// =============================================================================
// INSTALLATEUR
// =============================================================================

/**
 * Installe l'intercepteur demo sur une instance Axios.
 *
 * En mode demo, chaque requete est interceptee :
 * - Si une route match -> reponse mock immediate (+ delai artificiel)
 * - Si aucune route ne match -> erreur explicite pour ne pas masquer un trou API
 *
 * @param axiosInstance L'instance Axios (gÃ©nÃ©ralement `api` de client.ts)
 * @returns L'id de l'intercepteur (pour Ã©ventuel eject)
 */
export function installDemoInterceptor(axiosInstance: AxiosInstance): number {
  console.info(
    "%cMTS Demo Mode - intercepteur actif. Seules les routes explicitement simulees repondent en demo.",
    "color: #f59e0b; font-weight: bold; font-size: 14px;",
  );

  return axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const url = config.url || "";
    const method = (config.method || "get").toLowerCase() as HttpMethod;

    const route = DEMO_ROUTES.find((r) => r.method === method && r.pattern.test(url));

    if (route) {
      await delay(DEMO_LATENCY_MS);

      const data = route.handler(url, config);
      config.adapter = () => Promise.resolve(fakeResponse(data));

      return config;
    }

    console.error(`[Demo] Route non simulee: ${method.toUpperCase()} ${url}`);
    config.adapter = () => Promise.reject(buildUnmockedRouteError(method, url, config));
    return config;
  });
}

export default installDemoInterceptor;
