import pickle
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import time
import threading

import faiss
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from chat_response_builder import (
    build_answer_from_analysis,
    build_structured_analysis,
    deduplicate_results,
    detect_service_context,
    resolve_response_language,
    score_to_confidence,
)
from massive_incident_detector import (
    DetectionConfig,
    detect_massive_incident_candidates,
    load_ticket_records,
)
from manager_copilot_knn import (
    DEFAULT_K,
    MODEL_VERSION as MANAGER_COPILOT_MODEL_VERSION,
    load_or_train_artifact,
    score_cases_payload,
)

BASE_DIR = Path(__file__).resolve().parent
INDEX_DIR = BASE_DIR / "index"

INDEX_FILE = INDEX_DIR / "rag_faiss.index"
METADATA_FILE = INDEX_DIR / "rag_metadata.pkl"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CHATBOT_MODEL_VERSION = "rag-chatbot-1.2.0"
MASSIVE_DETECTION_MODEL_VERSION = "massive-detector-1.1.0"

app = FastAPI(title="API Chatbot IA Telecom", version="1.1.0")

startup_error: Optional[str] = None
index = None
metadata = []
model = None
ticket_records = []
runtime_loading = False
runtime_loaded = False
manager_copilot_artifact = None
manager_copilot_error: Optional[str] = None


def initialize_runtime() -> None:
    global startup_error, index, metadata, model, ticket_records, runtime_loading, runtime_loaded
    global manager_copilot_artifact, manager_copilot_error

    runtime_loading = True
    runtime_loaded = False
    startup_error = None
    manager_copilot_error = None

    try:
        manager_copilot_artifact = load_or_train_artifact()

        print("Chargement de l'index FAISS...")
        loaded_index = faiss.read_index(str(INDEX_FILE))

        print("Chargement des metadonnees...")
        with open(METADATA_FILE, "rb") as metadata_stream:
            loaded_metadata = pickle.load(metadata_stream)

        print("Chargement du modele d'embeddings...")
        loaded_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        loaded_ticket_records = load_ticket_records()

        index = loaded_index
        metadata = loaded_metadata
        model = loaded_model
        ticket_records = loaded_ticket_records
        runtime_loaded = True
    except Exception as error:  # pragma: no cover - startup fallback
        startup_error = f"{type(error).__name__}: {error}"
        if manager_copilot_artifact is None:
            manager_copilot_error = startup_error
        index = None
        metadata = []
        model = None
        ticket_records = []
    finally:
        runtime_loading = False


def _get_manager_copilot_artifact():
    global manager_copilot_artifact, manager_copilot_error

    if manager_copilot_artifact is not None:
        return manager_copilot_artifact

    try:
        manager_copilot_artifact = load_or_train_artifact()
        manager_copilot_error = None
    except Exception as error:  # pragma: no cover - runtime fallback
        manager_copilot_error = f"{type(error).__name__}: {error}"
        manager_copilot_artifact = None

    return manager_copilot_artifact


@app.on_event("startup")
def startup_event() -> None:
    # Keep API bootstrap fast: heavy model loading runs in background.
    threading.Thread(target=initialize_runtime, daemon=True).start()


class ChatRequest(BaseModel):
    question: str
    top_k: int = 5
    preferred_language: Optional[str] = None


class SearchResult(BaseModel):
    doc_type: str
    title: str
    service_name: str
    language: str
    score: float
    doc_id: str


class ChatAnalysisResponse(BaseModel):
    summary: str
    probable_cause: Optional[str] = None
    known_resolution: Optional[str] = None
    workaround: Optional[str] = None
    impact: str
    next_action: str
    clarification_needed: bool
    missing_information: List[str] = []
    caution: Optional[str] = None
    draft_ticket_title: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    confidence: str
    top_score: float
    service_detected: str
    service_detection_confidence: str
    response_language: str = "fr"
    analysis: ChatAnalysisResponse
    results: List[SearchResult]
    massive_incident_candidate: Optional["MassiveIncidentCandidateResponse"] = None
    model_version: str = CHATBOT_MODEL_VERSION
    fallback_mode: str = "rag_primary"
    reasoning_steps: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    risk_flags: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    latency_ms: Optional[float] = None


class MassiveIncidentDetectionRequest(BaseModel):
    hours_back: int = 72
    similarity_threshold: float = 0.72
    min_cluster_size: int = 3
    time_window_minutes: int = 180
    max_candidates: int = 5
    service_name: Optional[str] = None
    query_hint: Optional[str] = None
    reference_time: Optional[str] = None
    preferred_language: Optional[str] = None


class MassiveIncidentCandidateResponse(BaseModel):
    detected_service: str
    cluster_size: int
    likely_incident_title: str
    confidence_level: str
    confidence_score: float
    cluster_start: str
    cluster_end: str
    ticket_ids: List[str]
    detection_reason: str
    recommendation: str


class MassiveIncidentDetectionResponse(BaseModel):
    available: bool = True
    evaluated_tickets: int
    candidates_found: int
    candidates: List[MassiveIncidentCandidateResponse]
    confidence: str = "low"
    model_version: str = MASSIVE_DETECTION_MODEL_VERSION
    fallback_mode: str = "cluster_primary"
    reasoning_steps: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    risk_flags: List[str] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    latency_ms: Optional[float] = None


class ManagerCopilotFeatureSet(BaseModel):
    priority: str
    status: str
    age_hours: float = 0.0
    sla_remaining_minutes: float = 0.0
    sla_breached: bool = False
    service_degraded: bool = False
    similar_ticket_count: float = 0.0
    probable_mass_incident: bool = False
    duplicate_confidence: float = 0.0
    frustration_score: float = 0.0
    backlog_open_tickets: float = 0.0
    agent_open_ticket_count: float = 0.0
    incident_linked: bool = False
    business_impact: str = "MEDIUM"
    service_criticality: str = "MEDIUM"
    assigned: bool = False


class ManagerCopilotScoreCaseRequest(BaseModel):
    case_id: str
    title: str
    service_name: Optional[str] = None
    ticket_number: Optional[str] = None
    features: ManagerCopilotFeatureSet


class ManagerCopilotScoreRequest(BaseModel):
    k: int = DEFAULT_K
    cases: List[ManagerCopilotScoreCaseRequest]


class ManagerCopilotNearestExampleResponse(BaseModel):
    example_id: str
    label: str
    title: str
    summary: str
    recommendation: str
    distance: float
    feature_summary: List[str] = Field(default_factory=list)


class ManagerCopilotScoreCaseResponse(BaseModel):
    case_id: str
    predicted_action: str
    confidence_score: float
    confidence_level: str
    nearest_examples: List[ManagerCopilotNearestExampleResponse] = Field(default_factory=list)
    feature_summary: List[str] = Field(default_factory=list)
    reasoning: str
    inference_mode: str = "knn"
    model_version: str = MANAGER_COPILOT_MODEL_VERSION
    fallback_mode: str = "knn_primary"


class ManagerCopilotScoreResponse(BaseModel):
    available: bool = True
    model_version: str = MANAGER_COPILOT_MODEL_VERSION
    inference_mode: str = "knn"
    fallback_mode: str = "knn_primary"
    confidence_score: float = 0.0
    confidence_level: str = "low"
    results: List[ManagerCopilotScoreCaseResponse] = Field(default_factory=list)
    reasoning_steps: List[str] = Field(default_factory=list)


def _normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return " ".join(value.strip().lower().split())


def _token_overlap_score(query: str, title: str) -> float:
    query_tokens = {token for token in _normalize_text(query).split(" ") if len(token) > 2}
    title_tokens = {token for token in _normalize_text(title).split(" ") if len(token) > 2}

    if not query_tokens or not title_tokens:
        return 0.0

    overlap = query_tokens.intersection(title_tokens)
    return float(len(overlap)) / float(len(query_tokens))


def _build_detection_reason(
    candidate,
    request: MassiveIncidentDetectionRequest,
    language: str = "fr",
) -> str:
    if language == "en":
        return (
            f"{candidate.cluster_size} similar tickets were grouped on {candidate.detected_service} "
            f"between {candidate.cluster_start} and {candidate.cluster_end}. "
            f"Cluster confidence score: {candidate.confidence_score:.2f} "
            f"(similarity threshold={request.similarity_threshold}, window={request.time_window_minutes} min)."
        )

    return (
        f"{candidate.cluster_size} tickets similaires ont ete regroupes sur {candidate.detected_service} "
        f"entre {candidate.cluster_start} et {candidate.cluster_end}. "
        f"Score de confiance du cluster : {candidate.confidence_score:.2f} "
        f"(seuil similarite={request.similarity_threshold}, fenetre={request.time_window_minutes} min)."
    )


def _build_recommendation(candidate, language: str = "fr") -> str:
    if language == "en":
        return (
            "Potential widespread incident detected. "
            f"Prepare a global supervision ticket for {candidate.detected_service}, "
            "validate the cross-service impact and confirm before any definitive production creation."
        )

    return (
        "Candidat incident massif detecte. "
        f"Preparer un ticket global de supervision pour {candidate.detected_service}, "
        "valider l'impact transverse puis confirmer avant toute creation definitive en production."
    )


def _resolve_chat_fallback_mode(confidence: str, service_detection_confidence: str) -> str:
    if confidence == "low":
        return "low_confidence_guardrail"
    if service_detection_confidence == "low":
        return "service_ambiguity_guardrail"
    return "rag_primary"


def _build_chat_reasoning_steps(
    analysis: ChatAnalysisResponse,
    confidence: str,
    service_detected: str,
    top_score: float,
    has_results: bool,
    fallback_mode: str,
) -> List[str]:
    steps = [
        f"Top semantic score={top_score:.3f} ({'results_found' if has_results else 'no_results'}).",
        f"Service detecte={service_detected}, confidence={confidence}.",
        f"Mode de robustesse actif={fallback_mode}.",
    ]

    if analysis.probable_cause:
        steps.append("Cause probable extraite depuis les documents les plus proches.")
    if analysis.known_resolution:
        steps.append("Resolution connue proposee avec validation humaine requise.")
    if analysis.clarification_needed:
        steps.append("Des informations complementaires sont necessaires avant action definitive.")

    return steps


def _build_chat_recommended_actions(
    analysis: ChatAnalysisResponse,
    confidence: str,
    service_detected: str,
    massive_candidate: Optional[MassiveIncidentCandidateResponse],
    language: str,
) -> List[str]:
    actions: List[str] = []

    if analysis.next_action:
        actions.append(analysis.next_action)

    if confidence == "low":
        actions.append(
            "Complete the context (service, symptoms, timeline, impact) before escalation."
            if language == "en"
            else "Completer le contexte (service, symptomes, chronologie, impact) avant escalation."
        )
    else:
        actions.append(
            f"Verify similar incidents on {service_detected} before production changes."
            if language == "en"
            else f"Verifier les incidents similaires sur {service_detected} avant changement en production."
        )

    if massive_candidate and massive_candidate.recommendation:
        actions.append(massive_candidate.recommendation)

    deduplicated: List[str] = []
    seen = set()
    for action in actions:
        normalized = (action or "").strip().lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduplicated.append(action.strip())

    return deduplicated[:5]


def _build_chat_risk_flags(
    confidence: str,
    service_detection_confidence: str,
    analysis: ChatAnalysisResponse,
    massive_candidate: Optional[MassiveIncidentCandidateResponse],
) -> List[str]:
    risk_flags: List[str] = []

    if confidence == "low":
        risk_flags.append("LOW_CONFIDENCE")
    if service_detection_confidence == "low":
        risk_flags.append("SERVICE_AMBIGUITY")
    if analysis.clarification_needed:
        risk_flags.append("MISSING_CONTEXT")
    if massive_candidate:
        risk_flags.append("MASS_INCIDENT_CANDIDATE")

    return risk_flags


def _build_chat_sources(raw_results: List[dict]) -> List[str]:
    sources: List[str] = []
    seen = set()

    for result in raw_results[:5]:
        doc_id = (result.get("doc_id") or "").strip()
        title = (result.get("title") or "").strip()
        source = f"doc:{doc_id}" if doc_id else f"title:{title}"
        if not source or source in seen:
            continue
        seen.add(source)
        sources.append(source)

    return sources


def _resolve_detection_confidence(candidates: List[MassiveIncidentCandidateResponse]) -> str:
    if not candidates:
        return "low"
    return (candidates[0].confidence_level or "low").lower()


def _resolve_runtime_unavailability_reason(language: str = "fr") -> Optional[str]:
    if runtime_loading and model is None:
        if language == "en":
            return "The AI runtime is still starting. A reduced fallback response is returned."
        return "Le moteur IA est en cours d'initialisation. Une reponse degradee est renvoyee."

    if startup_error or index is None or model is None:
        if language == "en":
            return (
                "The AI runtime is not fully available. "
                "Check the FAISS index, embeddings model, and Python dependencies."
            )
        return (
            "Le moteur IA n'est pas completement disponible. "
            "Verifiez l'index FAISS, le modele d'embeddings et les dependances Python."
        )

    return None


def _build_detection_reasoning_steps(
    request: MassiveIncidentDetectionRequest,
    response_candidates: List[MassiveIncidentCandidateResponse],
) -> List[str]:
    steps = [
        f"Fenetre={request.hours_back}h, similarite>={request.similarity_threshold}, cluster_min={request.min_cluster_size}.",
        f"Candidats retenus={len(response_candidates)}.",
    ]

    if response_candidates:
        top = response_candidates[0]
        steps.append(
            f"Top candidat={top.detected_service}, cluster={top.cluster_size}, score={top.confidence_score:.3f}."
        )

    return steps


def _build_detection_actions(
    response_candidates: List[MassiveIncidentCandidateResponse],
    language: str,
) -> List[str]:
    if not response_candidates:
        return [
            "Continue monitoring and gather more correlated tickets."
            if language == "en"
            else "Poursuivre la surveillance et collecter plus de tickets correles."
        ]

    top = response_candidates[0]
    actions = [top.recommendation]
    actions.append(
        "Validate with supervision before opening a major-incident bridge."
        if language == "en"
        else "Valider avec la supervision avant ouverture d'un pont incident majeur."
    )
    return actions


def _build_detection_risk_flags(response_candidates: List[MassiveIncidentCandidateResponse]) -> List[str]:
    if not response_candidates:
        return ["NO_MASS_CLUSTER_DETECTED"]

    risk_flags = ["MASS_INCIDENT_CANDIDATE"]
    top = response_candidates[0]
    if (top.confidence_level or "").lower() == "high":
        risk_flags.append("HIGH_CLUSTER_CONFIDENCE")
    if top.cluster_size >= 5:
        risk_flags.append("HIGH_TICKET_VOLUME")
    return risk_flags


def _build_detection_sources(response_candidates: List[MassiveIncidentCandidateResponse]) -> List[str]:
    sources: List[str] = []
    for candidate in response_candidates[:3]:
        sources.append(f"service:{candidate.detected_service}")
        for ticket_id in candidate.ticket_ids[:5]:
            sources.append(f"ticket:{ticket_id}")
    return sources


def _rank_and_filter_candidates(
    candidates,
    request: MassiveIncidentDetectionRequest,
) -> List:
    filtered = candidates

    service_filter = _normalize_text(request.service_name)
    if service_filter:
        filtered = [
            candidate
            for candidate in filtered
            if _normalize_text(candidate.detected_service) == service_filter
        ]

    if not filtered:
        return []

    query_hint = request.query_hint or ""

    def candidate_rank(item):
        lexical_bonus = _token_overlap_score(query_hint, item.likely_incident_title)
        return item.confidence_score + (0.15 * lexical_bonus)

    ranked = sorted(filtered, key=candidate_rank, reverse=True)
    return ranked[: request.max_candidates]


def _parse_reference_time(reference_time: Optional[str]) -> Optional[datetime]:
    if not reference_time:
        return None

    raw_reference = reference_time.replace("Z", "+00:00")
    parsed_reference = datetime.fromisoformat(raw_reference)
    if parsed_reference.tzinfo is not None:
        parsed_reference = parsed_reference.astimezone().replace(tzinfo=None)
    return parsed_reference


def _run_massive_incident_detection(
    request: MassiveIncidentDetectionRequest,
    language: str = "fr",
) -> MassiveIncidentDetectionResponse:
    parsed_reference = _parse_reference_time(request.reference_time)

    config = DetectionConfig(
        hours_back=request.hours_back,
        similarity_threshold=request.similarity_threshold,
        min_cluster_size=request.min_cluster_size,
        time_window_minutes=request.time_window_minutes,
        max_candidates=request.max_candidates,
    )

    raw_candidates = detect_massive_incident_candidates(
        all_tickets=ticket_records,
        embedding_model=model,
        config=config,
        reference_time=parsed_reference,
    )

    ranked_candidates = _rank_and_filter_candidates(raw_candidates, request)

    response_candidates = [
        MassiveIncidentCandidateResponse(
            detected_service=item.detected_service,
            cluster_size=item.cluster_size,
            likely_incident_title=item.likely_incident_title,
            confidence_level=item.confidence_level,
            confidence_score=item.confidence_score,
            cluster_start=item.cluster_start,
            cluster_end=item.cluster_end,
            ticket_ids=item.ticket_ids,
            detection_reason=_build_detection_reason(item, request, language),
            recommendation=_build_recommendation(item, language),
        )
        for item in ranked_candidates
    ]

    detection_confidence = _resolve_detection_confidence(response_candidates)
    fallback_mode = "no_cluster_detected" if not response_candidates else "cluster_primary"
    reasoning_steps = _build_detection_reasoning_steps(request, response_candidates)
    recommended_actions = _build_detection_actions(response_candidates, language)
    risk_flags = _build_detection_risk_flags(response_candidates)
    sources = _build_detection_sources(response_candidates)

    return MassiveIncidentDetectionResponse(
        available=True,
        evaluated_tickets=len(ticket_records),
        candidates_found=len(response_candidates),
        candidates=response_candidates,
        confidence=detection_confidence,
        model_version=MASSIVE_DETECTION_MODEL_VERSION,
        fallback_mode=fallback_mode,
        reasoning_steps=reasoning_steps,
        recommended_actions=recommended_actions,
        risk_flags=risk_flags,
        missing_information=[],
        sources=sources,
    )


def _build_runtime_fallback_chat_response(
    request: ChatRequest,
    response_language: str,
    reason: str,
    started_at: float,
) -> ChatResponse:
    analysis = build_structured_analysis(
        question=request.question,
        raw_results=[],
        confidence="low",
        service_detected="N/A",
        language=response_language,
    )
    answer = build_answer_from_analysis(analysis, response_language)
    latency_ms = round((time.time() - started_at) * 1000, 1)

    recommended_actions = [
        "Redemarrer le microservice ai-chatbot puis relancer la question."
        if response_language == "fr"
        else "Restart the ai-chatbot service and ask again.",
        "Poursuivre l'analyse manuelle avec le contexte ticket disponible."
        if response_language == "fr"
        else "Continue with a manual analysis using the available ticket context.",
    ]

    return ChatResponse(
        answer=answer,
        confidence="low",
        top_score=0.0,
        service_detected="N/A",
        service_detection_confidence="low",
        response_language=response_language,
        analysis=ChatAnalysisResponse(
            summary=analysis.summary,
            probable_cause=analysis.probable_cause,
            known_resolution=analysis.known_resolution,
            workaround=analysis.workaround,
            impact=analysis.impact,
            next_action=analysis.next_action,
            clarification_needed=analysis.clarification_needed,
            missing_information=analysis.missing_information,
            caution=analysis.caution or reason,
            draft_ticket_title=analysis.draft_ticket_title,
        ),
        results=[],
        massive_incident_candidate=None,
        model_version=CHATBOT_MODEL_VERSION,
        fallback_mode="runtime_unavailable",
        reasoning_steps=[
            "Aucun resultat RAG n'a ete interroge car le runtime IA n'est pas pret."
            if response_language == "fr"
            else "No RAG lookup was executed because the AI runtime is not ready.",
            reason,
        ],
        recommended_actions=recommended_actions,
        risk_flags=["RUNTIME_UNAVAILABLE"],
        missing_information=analysis.missing_information if analysis.missing_information else [],
        sources=["runtime-fallback"],
        latency_ms=latency_ms,
    )


def _build_runtime_fallback_detection_response(
    request: MassiveIncidentDetectionRequest,
    language: str,
    reason: str,
    started_at: float,
) -> MassiveIncidentDetectionResponse:
    latency_ms = round((time.time() - started_at) * 1000, 1)

    return MassiveIncidentDetectionResponse(
        available=False,
        evaluated_tickets=len(ticket_records),
        candidates_found=0,
        candidates=[],
        confidence="low",
        model_version=MASSIVE_DETECTION_MODEL_VERSION,
        fallback_mode="runtime_unavailable",
        reasoning_steps=[
            "Detection massive non executee: runtime IA indisponible."
            if language == "fr"
            else "Massive-incident detection not executed because the AI runtime is unavailable.",
            reason,
        ],
        recommended_actions=[
            "Relancer ai-chatbot puis reexecuter la detection."
            if language == "fr"
            else "Restart ai-chatbot and rerun the detection.",
            "Continuer la supervision manuelle et consolider les tickets similaires."
            if language == "fr"
            else "Continue manual supervision and consolidate similar tickets.",
        ],
        risk_flags=["RUNTIME_UNAVAILABLE", "NO_MASS_CLUSTER_DETECTED"],
        missing_information=[],
        sources=["runtime-fallback"],
        latency_ms=latency_ms,
    )


@app.get("/")
def root():
    return {"message": "API Chatbot IA Telecom disponible"}


@app.get("/health")
def health():
    status = "starting" if runtime_loading and model is None else "ok"
    if startup_error:
        status = "degraded"

    return {
        "status": status,
        "documents_indexed": len(metadata),
        "ticket_records_loaded": len(ticket_records),
        "model_name": EMBEDDING_MODEL_NAME,
        "runtime_loading": runtime_loading,
        "runtime_loaded": runtime_loaded,
        "startup_error": startup_error,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    start_time = time.time()
    response_language = resolve_response_language(request.question, request.preferred_language)
    runtime_unavailability_reason = _resolve_runtime_unavailability_reason(response_language)

    if runtime_unavailability_reason:
        return _build_runtime_fallback_chat_response(
            request,
            response_language,
            runtime_unavailability_reason,
            start_time,
        )

    query_embedding = model.encode(
        [request.question],
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype("float32")

    scores, indices = index.search(query_embedding, request.top_k)

    raw_results = []
    for score, idx in zip(scores[0], indices[0]):
        doc = metadata[idx].copy()
        doc["score"] = float(score)
        raw_results.append(doc)

    raw_results = deduplicate_results(raw_results)

    api_results = [
        SearchResult(
            doc_type=doc.get("doc_type", ""),
            title=doc.get("title", ""),
            service_name=doc.get("service_name", ""),
            language=doc.get("language", ""),
            score=float(doc.get("score", 0)),
            doc_id=doc.get("doc_id", ""),
        )
        for doc in raw_results
    ]

    top_score = float(raw_results[0]["score"]) if raw_results else 0.0
    confidence = score_to_confidence(top_score) if raw_results else "low"
    service_detected, service_detection_confidence = detect_service_context(raw_results, top_score)
    analysis = build_structured_analysis(
        question=request.question,
        raw_results=raw_results,
        confidence=confidence,
        service_detected=service_detected,
        language=response_language,
    )
    answer = build_answer_from_analysis(analysis, response_language)
    massive_incident_candidate: Optional[MassiveIncidentCandidateResponse] = None

    if service_detected != "N/A" and confidence != "low":
        detection_request = MassiveIncidentDetectionRequest(
            service_name=service_detected,
            query_hint=request.question,
            hours_back=72,
            similarity_threshold=0.72,
            min_cluster_size=3,
            time_window_minutes=180,
            max_candidates=1,
        )

        detection_response = _run_massive_incident_detection(detection_request, response_language)
        if detection_response.candidates_found > 0:
            massive_incident_candidate = detection_response.candidates[0]

    fallback_mode = _resolve_chat_fallback_mode(confidence, service_detection_confidence)
    reasoning_steps = _build_chat_reasoning_steps(
        analysis,
        confidence,
        service_detected,
        top_score,
        len(raw_results) > 0,
        fallback_mode,
    )
    missing_information = analysis.missing_information if analysis.missing_information else []
    recommended_actions = _build_chat_recommended_actions(
        analysis,
        confidence,
        service_detected,
        massive_incident_candidate,
        response_language,
    )
    risk_flags = _build_chat_risk_flags(
        confidence,
        service_detection_confidence,
        analysis,
        massive_incident_candidate,
    )
    sources = _build_chat_sources(raw_results)
    latency_ms = round((time.time() - start_time) * 1000, 1)

    return ChatResponse(
        answer=answer,
        confidence=confidence,
        top_score=top_score,
        service_detected=service_detected,
        service_detection_confidence=service_detection_confidence,
        response_language=response_language,
        analysis=ChatAnalysisResponse(
            summary=analysis.summary,
            probable_cause=analysis.probable_cause,
            known_resolution=analysis.known_resolution,
            workaround=analysis.workaround,
            impact=analysis.impact,
            next_action=analysis.next_action,
            clarification_needed=analysis.clarification_needed,
            missing_information=analysis.missing_information,
            caution=analysis.caution,
            draft_ticket_title=analysis.draft_ticket_title,
        ),
        results=api_results,
        massive_incident_candidate=massive_incident_candidate,
        model_version=CHATBOT_MODEL_VERSION,
        fallback_mode=fallback_mode,
        reasoning_steps=reasoning_steps,
        recommended_actions=recommended_actions,
        risk_flags=risk_flags,
        missing_information=missing_information,
        sources=sources,
        latency_ms=latency_ms,
    )


@app.post("/manager-copilot/score", response_model=ManagerCopilotScoreResponse)
def score_manager_copilot_cases(request: ManagerCopilotScoreRequest):
    payload = score_cases_payload(
        cases=[case.model_dump() for case in request.cases],
        artifact=_get_manager_copilot_artifact(),
        k=request.k,
    )
    return ManagerCopilotScoreResponse(**payload)


@app.post("/massive-incidents/detect", response_model=MassiveIncidentDetectionResponse)
def detect_massive_incidents(request: MassiveIncidentDetectionRequest):
    start_time = time.time()

    try:
        response_language = resolve_response_language(
            request.query_hint or "",
            request.preferred_language,
        )
        runtime_unavailability_reason = _resolve_runtime_unavailability_reason(response_language)
        if runtime_unavailability_reason:
            return _build_runtime_fallback_detection_response(
                request,
                response_language,
                runtime_unavailability_reason,
                start_time,
            )
        response = _run_massive_incident_detection(request, response_language)
        response.latency_ms = round((time.time() - start_time) * 1000, 1)
        return response
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="reference_time must be a valid ISO datetime string",
        ) from error
