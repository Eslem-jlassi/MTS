// =============================================================================
// MTS TELECOM - Demo Mode Interceptor (Axios)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================
//
// OBJECTIF:
// Intercepter TOUTES les requêtes Axios en mode démo et retourner
// des données mock réalistes SANS contacter le backend.
//
// FONCTIONNEMENT:
// 1. installDemoInterceptor(axiosInstance) enregistre un request interceptor
// 2. Chaque requête est comparée à une table de routes
// 3. Si un match est trouvé, on retourne immédiatement une AxiosResponse mock
// 4. Un délai artificiel (DEMO_LATENCY_MS) simule le réseau
//
// AVANTAGE:
// Zéro modification dans les services API existants.
// Le code de production reste intact.
//
// =============================================================================

import { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { DEMO_LATENCY_MS, DEMO_TOKEN, DEMO_USER } from "./demoConfig";
import { DEMO_TICKETS, DEMO_INCIDENTS, DEMO_SERVICES, DEMO_USERS, DEMO_CLIENTS, DEMO_AUDIT_LOGS, DEMO_NOTIFICATIONS, DEMO_SLA_POLICIES, DEMO_AGENT_PERFORMANCE, DEMO_DASHBOARD_STATS } from "./demoData";
import type { PageResponse } from "../types";

// =============================================================================
// HELPERS
// =============================================================================

/** Simule un délai réseau */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Construit une PageResponse<T> à partir d'un array complet */
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
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config: {} as InternalAxiosRequestConfig,
  };
}

/** Extrait l'id numérique d'un segment de path (ex: "/tickets/42" → 42) */
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
  /** Regex pattern à tester sur l'URL (sans baseURL) */
  pattern: RegExp;
  /** Handler retournant les données mock */
  handler: (url: string, config: InternalAxiosRequestConfig) => unknown;
}

/**
 * Table de routage démo.
 * Chaque route intercepte un endpoint spécifique.
 * L'ordre est important : les patterns plus précis viennent en premier.
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
      refreshToken: "demo-refresh-token",
      user: DEMO_USER,
    }),
  },
  {
    method: "get",
    pattern: /\/auth\/me$/,
    handler: () => DEMO_USER,
  },
  {
    method: "put",
    pattern: /\/auth\/me$/,
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
    method: "post",
    pattern: /\/auth\/refresh$/,
    handler: () => ({
      accessToken: DEMO_TOKEN,
      refreshToken: "demo-refresh-token-new",
    }),
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
    handler: () => ({
      id: 999,
      content: "Commentaire démo ajouté",
      authorId: DEMO_USER.id,
      authorName: DEMO_USER.fullName,
      createdAt: new Date().toISOString(),
    }),
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
      ticketNumber: "TKT-2026-DEMO",
      title: "Nouveau ticket (démo)",
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
      { id: 1, type: "NOTE", message: "Incident créé", createdAt: new Date().toISOString(), authorName: "Système" },
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
      incidentNumber: "INC-2026-DEMO",
      title: "Nouvel incident (démo)",
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
  // SERVICES TÉLÉCOM
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
      { id: 1, status: "UP", timestamp: new Date().toISOString(), changedBy: "Système" },
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
    handler: () => ({ ...DEMO_SERVICES[0], id: 999, name: "Nouveau service (démo)" }),
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
    handler: () => ({ ...DEMO_CLIENTS[0], id: 999, clientCode: "CLI-DEMO" }),
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
  // AUDIT LOGS  (⚠️ prefix = /api/audit-logs dans le service)
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
    handler: () => ({ ...DEMO_SLA_POLICIES[0], id: 999, name: "SLA Démo" }),
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
        id: 1, name: "Escalade auto SLA 80%", triggerType: "AT_RISK", thresholdPercent: 80,
        escalationLevel: 1, notifyRoles: "MANAGER", enabled: true, sortOrder: 1,
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
        id: 1, name: "Heures bureau standard", startHour: 8, endHour: 18,
        workDays: "MON,TUE,WED,THU,FRI", timezone: "Africa/Casablanca",
        isDefault: true, active: true, createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    method: "get",
    pattern: /\/business-hours\/\d+$/,
    handler: () => ({
      id: 1, name: "Heures bureau standard", startHour: 8, endHour: 18,
      workDays: "MON,TUE,WED,THU,FRI", timezone: "Africa/Casablanca",
      isDefault: true, active: true, createdAt: new Date().toISOString(),
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
        id: 1, name: "Accusé de réception", content: "Bonjour {client}, votre ticket {ticketId} a bien été reçu.",
        category: "accuse", variables: ["client", "ticketId"], createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2, name: "Résolution standard", content: "Le problème a été résolu. N'hésitez pas à rouvrir ce ticket si nécessaire.",
        category: "resolution", variables: [], createdAt: new Date().toISOString(),
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
          id: 1, title: "Rapport SLA Janvier 2026", type: "SLA",
          status: "published", format: "PDF", generatedAt: new Date().toISOString(),
          size: 245000, createdByName: "Mohammed Benali",
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
      id: 999, title: "Rapport Démo", type: "GENERAL",
      status: "generated", format: "PDF", generatedAt: new Date().toISOString(),
      size: 100000, createdByName: DEMO_USER.fullName,
    }),
  },
];

// =============================================================================
// INSTALLATEUR
// =============================================================================

/**
 * Installe l'intercepteur demo sur une instance Axios.
 *
 * En mode démo, CHAQUE requête est interceptée :
 * - Si une route match → réponse mock immédiate (+ délai artificiel)
 * - Si aucune route ne match → on laisse passer (fallback, évite les crashs)
 *
 * @param axiosInstance L'instance Axios (généralement `api` de client.ts)
 * @returns L'id de l'intercepteur (pour éventuel eject)
 */
export function installDemoInterceptor(axiosInstance: AxiosInstance): number {
  console.info(
    "%c🎭 MTS Demo Mode — Intercepteur installé. Toutes les requêtes retournent des données fictives.",
    "color: #f59e0b; font-weight: bold; font-size: 14px;"
  );

  return axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const url = config.url || "";
      const method = (config.method || "get").toLowerCase() as HttpMethod;

      // Cherche une route qui match
      const route = DEMO_ROUTES.find(
        (r) => r.method === method && r.pattern.test(url)
      );

      if (route) {
        // Simule un délai réseau
        await delay(DEMO_LATENCY_MS);

        const data = route.handler(url, config);

        // On "court-circuite" Axios en lançant une erreur spéciale
        // que notre adapter transformera en réponse.
        // Technique: on utilise adapter custom pour retourner directement la réponse.
        config.adapter = () => Promise.resolve(fakeResponse(data));

        return config;
      }

      // Aucune route ne match → on trace un warning pour faciliter le debug
      console.warn(`[Demo] ⚠️ Pas de mock pour: ${method.toUpperCase()} ${url}`);

      // Fallback: retourne une réponse vide pour éviter les erreurs réseau
      config.adapter = () => Promise.resolve(fakeResponse({}));
      return config;
    }
  );
}

export default installDemoInterceptor;
