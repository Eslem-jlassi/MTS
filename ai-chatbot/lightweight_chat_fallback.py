from __future__ import annotations

import csv
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


DATASET_FILE = Path(__file__).resolve().parent / "data" / "tickets_dataset_rag.csv"

SERVICE_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "CRM Ericsson": ("crm", "customer", "contact", "commercial", "vente", "sales", "ericsson"),
    "BSCS Billing System": (
        "bscs",
        "billing",
        "bill run",
        "facturation",
        "cdr",
        "rating",
        "roaming",
        "invoice",
        "invoice pdf",
    ),
    "Core Network OSS": (
        "reseau",
        "réseau",
        "network",
        "core",
        "oss",
        "kpi",
        "supervision",
        "radio",
        "noc",
    ),
    "VoIP Platform": ("voip", "sip", "appel", "telephonie", "téléphonie", "echo", "latence"),
    "Data Migration Engine": ("migration", "data migration", "etl", "batch", "donnees", "données"),
    "Fibre FTTH": ("fibre", "fiber", "ftth", "optique", "wan", "internet fixe", "cpe"),
}

STOPWORDS = {
    "a",
    "an",
    "au",
    "aux",
    "avec",
    "ce",
    "ces",
    "dans",
    "de",
    "des",
    "du",
    "en",
    "et",
    "for",
    "from",
    "il",
    "la",
    "le",
    "les",
    "mais",
    "mon",
    "my",
    "ou",
    "par",
    "pour",
    "probleme",
    "problem",
    "sur",
    "the",
    "to",
    "un",
    "une",
}


@dataclass(frozen=True)
class LightweightChatCase:
    ticket_id: str
    ticket_number: str
    title: str
    description: str
    service_name: str
    root_cause: str
    resolution: str
    comments_summary: str
    language: str
    created_at: Optional[datetime]


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    cleaned = _strip_accents(value).lower()
    return re.sub(r"\s+", " ", cleaned).strip()


def tokenize(value: Optional[str]) -> List[str]:
    normalized = normalize_text(value)
    tokens = re.findall(r"[a-z0-9]+", normalized)
    return [token for token in tokens if len(token) > 2 and token not in STOPWORDS]


def infer_service_from_query(question: str) -> Tuple[str, str]:
    normalized_question = normalize_text(question)
    if not normalized_question:
        return ("N/A", "low")

    scores: Dict[str, float] = {}
    for service_name, keywords in SERVICE_KEYWORDS.items():
        score = 0.0
        normalized_service = normalize_text(service_name)
        if normalized_service in normalized_question:
            score += 2.5

        for keyword in keywords:
            normalized_keyword = normalize_text(keyword)
            if not normalized_keyword:
                continue
            if normalized_keyword in normalized_question:
                score += 1.4 if " " in normalized_keyword else 1.0

        if score > 0:
            scores[service_name] = score

    if not scores:
        return ("N/A", "low")

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_service, top_score = ordered[0]
    second_score = ordered[1][1] if len(ordered) > 1 else 0.0

    if top_score >= 2.5 and top_score >= second_score + 0.8:
        return (top_service, "high")
    if top_score >= 1.0:
        return (top_service, "medium")
    return ("N/A", "low")


def load_lightweight_chat_cases(csv_path: Path = DATASET_FILE) -> List[LightweightChatCase]:
    cases: List[LightweightChatCase] = []

    if not csv_path.exists():
        return cases

    with csv_path.open("r", encoding="utf-8") as csv_stream:
        reader = csv.DictReader(csv_stream)
        for row in reader:
            title = (row.get("title") or "").strip()
            description = (row.get("description") or "").strip()
            service_name = (row.get("service_name") or "").strip()
            if not title or not service_name:
                continue

            created_at = None
            created_at_raw = (row.get("created_at") or "").strip()
            if created_at_raw:
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                    try:
                        created_at = datetime.strptime(created_at_raw, fmt)
                        break
                    except ValueError:
                        continue

            cases.append(
                LightweightChatCase(
                    ticket_id=(row.get("ticket_id") or "").strip(),
                    ticket_number=(row.get("ticket_number") or "").strip(),
                    title=title,
                    description=description,
                    service_name=service_name,
                    root_cause=(row.get("root_cause") or "").strip(),
                    resolution=(row.get("resolution") or "").strip(),
                    comments_summary=(row.get("comments_summary") or "").strip(),
                    language=(row.get("language") or "fr").strip() or "fr",
                    created_at=created_at,
                )
            )

    cases.sort(key=lambda item: item.created_at or datetime.min, reverse=True)
    return cases


def _term_overlap_score(query_tokens: Sequence[str], candidate_tokens: Sequence[str]) -> float:
    if not query_tokens or not candidate_tokens:
        return 0.0

    query_set = set(query_tokens)
    candidate_set = set(candidate_tokens)
    overlap = query_set.intersection(candidate_set)
    if not overlap:
        return 0.0

    return float(len(overlap)) / float(len(query_set))


def _build_case_content(case: LightweightChatCase) -> str:
    content_parts: List[str] = [f"Service: {case.service_name}"]
    if case.root_cause:
        content_parts.append(f"Root Cause: {case.root_cause}")
    if case.resolution:
        content_parts.append(f"Resolution: {case.resolution}")
    if case.comments_summary:
        content_parts.append(f"Notes: {case.comments_summary}")
    if case.description:
        content_parts.append(f"Context: {case.description}")
    return ". ".join(content_parts)


def search_lightweight_chat_cases(
    question: str,
    cases: Sequence[LightweightChatCase],
    top_k: int = 5,
) -> List[dict]:
    query_tokens = tokenize(question)
    inferred_service, inferred_service_confidence = infer_service_from_query(question)
    normalized_question = normalize_text(question)

    ranked_results: List[Tuple[float, dict]] = []

    for case in cases:
        title_tokens = tokenize(case.title)
        description_tokens = tokenize(case.description)
        service_tokens = tokenize(case.service_name)
        notes_tokens = tokenize(case.comments_summary)
        resolution_tokens = tokenize(case.resolution)
        cause_tokens = tokenize(case.root_cause)

        title_overlap = _term_overlap_score(query_tokens, title_tokens)
        description_overlap = _term_overlap_score(
            query_tokens,
            description_tokens + notes_tokens + resolution_tokens + cause_tokens,
        )
        service_overlap = _term_overlap_score(query_tokens, service_tokens)

        service_bonus = 0.0
        if inferred_service != "N/A" and case.service_name == inferred_service:
            service_bonus = 0.34 if inferred_service_confidence == "high" else 0.22

        phrase_bonus = 0.0
        normalized_service_name = normalize_text(case.service_name)
        if normalized_service_name and normalized_service_name in normalized_question:
            phrase_bonus = 0.18

        score = min(
            0.96,
            (title_overlap * 0.46)
            + (description_overlap * 0.32)
            + (service_overlap * 0.18)
            + service_bonus
            + phrase_bonus,
        )

        if score < 0.14 and service_bonus < 0.2:
            continue

        ranked_results.append(
            (
                score,
                {
                    "doc_type": "ticket_case",
                    "title": case.title,
                    "service_name": case.service_name,
                    "language": case.language,
                    "score": round(score, 3),
                    "doc_id": case.ticket_number or case.ticket_id or case.title,
                    "content": _build_case_content(case),
                },
            )
        )

    ranked_results.sort(
        key=lambda item: (item[0], item[1]["service_name"] == inferred_service, item[1]["title"]),
        reverse=True,
    )

    if not ranked_results and inferred_service != "N/A":
        service_cases = [case for case in cases if case.service_name == inferred_service][:top_k]
        seeded_score = 0.28 if inferred_service_confidence == "high" else 0.22
        for index, case in enumerate(service_cases):
            ranked_results.append(
                (
                    seeded_score - (index * 0.02),
                    {
                        "doc_type": "ticket_case",
                        "title": case.title,
                        "service_name": case.service_name,
                        "language": case.language,
                        "score": round(max(0.12, seeded_score - (index * 0.02)), 3),
                        "doc_id": case.ticket_number or case.ticket_id or case.title,
                        "content": _build_case_content(case),
                    },
                )
            )

    return [payload for _, payload in ranked_results[:top_k]]
