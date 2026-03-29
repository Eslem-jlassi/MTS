import pickle
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import faiss
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
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

BASE_DIR = Path(__file__).resolve().parent
INDEX_DIR = BASE_DIR / "index"

INDEX_FILE = INDEX_DIR / "rag_faiss.index"
METADATA_FILE = INDEX_DIR / "rag_metadata.pkl"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

app = FastAPI(title="API Chatbot IA Telecom", version="1.1.0")

startup_error: Optional[str] = None
index = None
metadata = []
model = None
ticket_records = []

try:
    print("Chargement de l'index FAISS...")
    index = faiss.read_index(str(INDEX_FILE))

    print("Chargement des metadonnees...")
    with open(METADATA_FILE, "rb") as metadata_stream:
        metadata = pickle.load(metadata_stream)

    print("Chargement du modele d'embeddings...")
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    ticket_records = load_ticket_records()
except Exception as error:  # pragma: no cover - startup fallback
    startup_error = f"{type(error).__name__}: {error}"
    index = None
    metadata = []
    model = None
    ticket_records = []


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
    evaluated_tickets: int
    candidates_found: int
    candidates: List[MassiveIncidentCandidateResponse]


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

    return MassiveIncidentDetectionResponse(
        evaluated_tickets=len(ticket_records),
        candidates_found=len(response_candidates),
        candidates=response_candidates,
    )


def ensure_runtime_ready() -> None:
    if startup_error or index is None or model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Le moteur du chatbot IA n'est pas pret. "
                "Verifiez les index, le modele d'embeddings et les dependances Python."
            ),
        )


@app.get("/")
def root():
    return {"message": "API Chatbot IA Telecom disponible"}


@app.get("/health")
def health():
    return {
        "status": "ok" if not startup_error else "degraded",
        "documents_indexed": len(metadata),
        "ticket_records_loaded": len(ticket_records),
        "model_name": EMBEDDING_MODEL_NAME,
        "startup_error": startup_error,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    ensure_runtime_ready()
    response_language = resolve_response_language(request.question, request.preferred_language)

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
    )


@app.post("/massive-incidents/detect", response_model=MassiveIncidentDetectionResponse)
def detect_massive_incidents(request: MassiveIncidentDetectionRequest):
    ensure_runtime_ready()

    try:
        response_language = resolve_response_language(
            request.query_hint or "",
            request.preferred_language,
        )
        return _run_massive_incident_detection(request, response_language)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="reference_time must be a valid ISO datetime string",
        ) from error
