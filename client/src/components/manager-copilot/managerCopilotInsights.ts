import type {
  ManagerCopilotAssignmentSignal,
  ManagerCopilotConfidence,
  ManagerCopilotDecisionArea,
  ManagerCopilotSignal,
  ManagerCopilotTone,
  ManagerCopilotWhyCard,
} from "./types";

interface ManagerCopilotInsightInput {
  summary: string;
  priorityTickets: ManagerCopilotSignal[];
  probableIncidents: ManagerCopilotSignal[];
  assignments: ManagerCopilotAssignmentSignal[];
  slaAlerts: ManagerCopilotSignal[];
}

export function buildDecisionAreas({
  summary,
  priorityTickets,
  probableIncidents,
  assignments,
  slaAlerts,
}: ManagerCopilotInsightInput): ManagerCopilotDecisionArea[] {
  return [
    {
      id: "priority",
      title: "Priorisation",
      headline:
        priorityTickets.length > 0
          ? `${priorityTickets.length} dossier(s) appellent un arbitrage rapide`
          : "Aucun dossier n'appelle de repriorisation immediate",
      description:
        priorityTickets[0]?.whyMatters ||
        "Le copilote met en avant les tickets ou impact metier, risque SLA et contexte service se renforcent.",
      tone: dominantTone(priorityTickets),
      confidence: dominantConfidence(priorityTickets),
    },
    {
      id: "load-balancing",
      title: "Charge equipe",
      headline:
        assignments.length > 0
          ? `${assignments.length} repartition(s) suggeree(s) pour lisser la charge`
          : "Aucune reallocation urgente n'est detectee",
      description:
        assignments[0]?.whyMatters ||
        "Les recommandations d'affectation cherchent a absorber le flux sans degrader le temps de resolution.",
      tone: dominantTone(assignments),
      confidence: dominantConfidence(assignments),
    },
    {
      id: "incident-watch",
      title: "Incident global",
      headline:
        probableIncidents.length > 0
          ? `${probableIncidents.length} signal(s) convergent vers une cause commune`
          : "Aucun faisceau critique ne justifie un incident global",
      description:
        probableIncidents[0]?.whyMatters ||
        "Le copilote rapproche tickets, services et incidents actifs pour eviter une reaction trop tardive.",
      tone: dominantTone(probableIncidents),
      confidence: dominantConfidence(probableIncidents),
    },
    {
      id: "sla-prevention",
      title: "Risque SLA",
      headline:
        slaAlerts.length > 0
          ? `${slaAlerts.length} ticket(s) sont a proteger avant rupture`
          : "Le portefeuille ne montre pas de derive SLA immediate",
      description:
        slaAlerts[0]?.whyMatters ||
        "Les alertes font ressortir les dossiers ou une decision manager peut encore eviter escalation et rupture.",
      tone: dominantTone(slaAlerts),
      confidence: dominantConfidence(slaAlerts),
    },
    {
      id: "executive-brief",
      title: "Synthese manager",
      headline: "Point de situation pret a partager",
      description: summary,
      tone: dominantTone([...priorityTickets, ...probableIncidents, ...slaAlerts]),
      confidence: dominantConfidence([
        ...priorityTickets,
        ...probableIncidents,
        ...assignments,
        ...slaAlerts,
      ]),
    },
  ];
}

export function buildWhyCards({
  priorityTickets,
  probableIncidents,
  assignments,
  slaAlerts,
}: Omit<ManagerCopilotInsightInput, "summary">): ManagerCopilotWhyCard[] {
  return [
    {
      id: "why-now",
      title: "Fenetre d'action",
      description:
        slaAlerts.length > 0
          ? "Une decision rapide peut encore eviter une rupture SLA ou contenir une escalation inutile."
          : priorityTickets.length > 0
            ? "Une priorisation precoce reduit le bruit operationnel et concentre l'equipe sur les dossiers structurants."
            : "Le portefeuille reste maitrise, ce qui laisse de la marge pour arbitrer les sujets a plus forte valeur.",
      tone: dominantTone([...slaAlerts, ...priorityTickets]),
    },
    {
      id: "why-balance",
      title: "Capacite equipe",
      description:
        assignments.length > 0
          ? "Repartir plus tot les dossiers sensibles reduit les points de congestion et aide a tenir le MTTR."
          : "Aucune tension forte de capacite n'est detectee dans la file a cet instant.",
      tone: dominantTone(assignments),
    },
    {
      id: "why-correlate",
      title: "Lecture transverse",
      description:
        probableIncidents.length > 0
          ? "Relier plusieurs tickets a une cause commune accelere la communication et evite les traitements en silo."
          : "Les signaux actuels restent plutot isoles, sans indice fort d'un incident transverse.",
      tone: dominantTone(probableIncidents),
    },
  ];
}

function dominantTone(signals: Array<{ tone: ManagerCopilotTone }>): ManagerCopilotTone {
  if (signals.some((signal) => signal.tone === "critical")) {
    return "critical";
  }
  if (signals.some((signal) => signal.tone === "warning")) {
    return "warning";
  }
  if (signals.some((signal) => signal.tone === "info")) {
    return "info";
  }
  if (signals.some((signal) => signal.tone === "success")) {
    return "success";
  }
  return "neutral";
}

function dominantConfidence(
  signals: Array<{ confidence: ManagerCopilotConfidence }>,
): ManagerCopilotConfidence {
  if (signals.some((signal) => signal.confidence === "high")) {
    return "high";
  }
  if (signals.some((signal) => signal.confidence === "medium")) {
    return "medium";
  }
  return "low";
}
