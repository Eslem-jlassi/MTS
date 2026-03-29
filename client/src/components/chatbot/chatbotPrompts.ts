import { ChatLanguage } from "./chatbotLanguage";

export interface ChatbotPrompt {
  id: string;
  label: string;
  message: string;
}

const TELECOM_QUICK_PROMPTS_BY_LANGUAGE: Record<ChatLanguage, ChatbotPrompt[]> = {
  fr: [
    {
      id: "incidents-ouverts",
      label: "Incidents ouverts",
      message: "Montre-moi les incidents ouverts.",
    },
    {
      id: "tickets-similaires",
      label: "Tickets similaires",
      message: "Trouve des tickets similaires pour cet incident.",
    },
    {
      id: "risque-sla",
      label: "Risque SLA",
      message: "Evalue le risque SLA sur ce cas.",
    },
    {
      id: "etat-services",
      label: "Etat des services",
      message: "Donne-moi l'etat actuel des services impactes.",
    },
    { id: "incident-voip", label: "Incident VoIP", message: "Analyse un incident VoIP." },
    { id: "incident-bscs", label: "Incident BSCS", message: "Analyse un incident BSCS." },
    { id: "incident-crm", label: "Incident CRM", message: "Analyse un incident CRM." },
    {
      id: "creer-ticket",
      label: "Brouillon ticket",
      message: "Prepare un brouillon de ticket d'incident.",
    },
  ],
  en: [
    {
      id: "open-incidents",
      label: "Open incidents",
      message: "Show me the open incidents.",
    },
    {
      id: "similar-tickets",
      label: "Similar tickets",
      message: "Find similar tickets for this incident.",
    },
    {
      id: "sla-risk",
      label: "SLA risk",
      message: "Assess the SLA risk for this case.",
    },
    {
      id: "service-health",
      label: "Service health",
      message: "Give me the current status of the impacted services.",
    },
    { id: "incident-voip", label: "VoIP incident", message: "Analyze a VoIP incident." },
    { id: "incident-bscs", label: "BSCS incident", message: "Analyze a BSCS incident." },
    { id: "incident-crm", label: "CRM incident", message: "Analyze a CRM incident." },
    {
      id: "create-ticket",
      label: "Ticket draft",
      message: "Prepare an incident ticket draft.",
    },
  ],
};

export const getTelecomQuickPrompts = (language: ChatLanguage = "fr"): ChatbotPrompt[] =>
  TELECOM_QUICK_PROMPTS_BY_LANGUAGE[language] || TELECOM_QUICK_PROMPTS_BY_LANGUAGE.fr;

export const TELECOM_QUICK_PROMPTS = getTelecomQuickPrompts("fr");
