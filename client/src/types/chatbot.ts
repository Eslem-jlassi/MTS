export interface ChatbotApiResult {
  doc_type: string;
  title: string;
  service_name: string;
  language: string;
  score: number;
  doc_id: string;
}

export interface ChatbotApiResponse {
  available?: boolean;
  message?: string;
  answer: string;
  confidence: string;
  top_score?: number;
  service_detected: string;
  service_detection_confidence?: string;
  response_language?: string;
  analysis?: ChatbotApiAnalysis | null;
  results: ChatbotApiResult[];
  massive_incident_candidate?: ChatbotApiMassiveIncidentCandidate | null;
  model_version?: string;
  fallback_mode?: string;
  reasoning_steps?: string[];
  recommended_actions?: string[];
  risk_flags?: string[];
  missing_information?: string[];
  sources?: string[];
  latency_ms?: number;
}

export interface ChatbotApiAnalysis {
  summary: string;
  probable_cause?: string;
  known_resolution?: string;
  workaround?: string;
  impact: string;
  next_action: string;
  clarification_needed: boolean;
  missing_information: string[];
  caution?: string;
  draft_ticket_title?: string;
}

export interface ChatbotApiMassiveIncidentCandidate {
  detected_service: string;
  likely_incident_title: string;
  cluster_size: number;
  confidence_level: string;
  confidence_score: number;
  cluster_start: string;
  cluster_end: string;
  ticket_ids: string[];
  detection_reason: string;
  recommendation: string;
}

export interface ChatbotResult {
  docType: string;
  title: string;
  serviceName: string;
  language: string;
  score: number;
  docId: string;
}

export interface ChatbotResponse {
  available?: boolean;
  message?: string;
  answer: string;
  confidence: string;
  topScore?: number;
  serviceDetected: string;
  serviceDetectionConfidence?: string;
  responseLanguage?: "fr" | "en";
  analysis?: ChatbotAnalysis | null;
  results: ChatbotResult[];
  massiveIncidentCandidate?: ChatbotMassiveIncidentCandidate | null;
  modelVersion?: string;
  fallbackMode?: string;
  reasoningSteps?: string[];
  recommendedActions?: string[];
  riskFlags?: string[];
  missingInformation?: string[];
  sources?: string[];
  latencyMs?: number;
}

export interface ChatbotAnalysis {
  summary: string;
  probableCause?: string;
  knownResolution?: string;
  workaround?: string;
  impact: string;
  nextAction: string;
  clarificationNeeded: boolean;
  missingInformation: string[];
  caution?: string;
  draftTicketTitle?: string;
}

export interface ChatbotMassiveIncidentCandidate {
  detectedService: string;
  likelyIncidentTitle: string;
  clusterSize: number;
  confidenceLevel: string;
  confidenceScore: number;
  clusterStart: string;
  clusterEnd: string;
  ticketIds: string[];
  detectionReason: string;
  recommendation: string;
}

export interface ChatbotRequest {
  question: string;
  preferred_language?: "fr" | "en";
}

export type ChatRole = "user" | "assistant";

export interface ChatAttachment {
  id: string;
  kind: "image";
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  attachedContext: boolean;
}

export interface ChatMessageModel {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  responseLanguage?: "fr" | "en";
  attachments?: ChatAttachment[];
  confidence?: string;
  serviceDetected?: string;
  serviceDetectionConfidence?: string;
  analysis?: ChatbotAnalysis | null;
  results?: ChatbotResult[];
  massiveIncidentCandidate?: ChatbotMassiveIncidentCandidate | null;
  modelVersion?: string;
  fallbackMode?: string;
  reasoningSteps?: string[];
  recommendedActions?: string[];
  riskFlags?: string[];
  missingInformation?: string[];
  sources?: string[];
  latencyMs?: number;
  isLoading?: boolean;
  isError?: boolean;
}
