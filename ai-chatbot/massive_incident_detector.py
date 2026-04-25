from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Sequence
import csv

try:
    import numpy as np
except Exception:  # pragma: no cover - optional lightweight Docker mode
    np = None

DATASET_FILE = Path(__file__).resolve().parent / "data" / "tickets_dataset_rag.csv"


@dataclass(frozen=True)
class TicketRecord:
    ticket_id: str
    title: str
    description: str
    service_name: str
    created_at: datetime


@dataclass(frozen=True)
class DetectionConfig:
    hours_back: int = 72
    similarity_threshold: float = 0.72
    min_cluster_size: int = 3
    time_window_minutes: int = 180
    max_candidates: int = 5


@dataclass(frozen=True)
class MassiveIncidentCandidate:
    detected_service: str
    cluster_size: int
    likely_incident_title: str
    confidence_level: str
    confidence_score: float
    cluster_start: str
    cluster_end: str
    ticket_ids: List[str]


def _parse_datetime(value: str) -> Optional[datetime]:
    if not value:
        return None

    raw = value.strip()
    if not raw:
        return None

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    return None


def load_ticket_records(csv_path: Path = DATASET_FILE) -> List[TicketRecord]:
    """Load ticket records used for massive incident candidate detection."""
    records: List[TicketRecord] = []

    if not csv_path.exists():
        return records

    with csv_path.open("r", encoding="utf-8") as csv_stream:
        reader = csv.DictReader(csv_stream)
        for row in reader:
            created_at = _parse_datetime(row.get("created_at", ""))
            service_name = (row.get("service_name") or "").strip()
            title = (row.get("title") or "").strip()
            description = (row.get("description") or "").strip()

            if not created_at or not service_name or not title:
                continue

            records.append(
                TicketRecord(
                    ticket_id=(row.get("ticket_id") or "").strip() or "N/A",
                    title=title,
                    description=description,
                    service_name=service_name,
                    created_at=created_at,
                )
            )

    records.sort(key=lambda item: item.created_at)
    return records


def _ticket_text(ticket: TicketRecord) -> str:
    return f"{ticket.title}. {ticket.description}".strip()


def _confidence_from_score(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def _connected_components(adjacency: Dict[int, List[int]], total_nodes: int) -> List[List[int]]:
    visited = [False] * total_nodes
    components: List[List[int]] = []

    for node in range(total_nodes):
        if visited[node]:
            continue

        stack = [node]
        visited[node] = True
        component: List[int] = []

        while stack:
            current = stack.pop()
            component.append(current)

            for neighbor in adjacency.get(current, []):
                if visited[neighbor]:
                    continue
                visited[neighbor] = True
                stack.append(neighbor)

        components.append(component)

    return components


def _pick_likely_title(cluster_indices: Sequence[int], tickets: Sequence[TicketRecord], sim_matrix: np.ndarray) -> str:
    if len(cluster_indices) == 1:
        return tickets[cluster_indices[0]].title

    best_index = cluster_indices[0]
    best_avg = -1.0

    for idx in cluster_indices:
        similarities = [float(sim_matrix[idx, j]) for j in cluster_indices if j != idx]
        avg_similarity = float(np.mean(similarities)) if similarities else 0.0
        if avg_similarity > best_avg:
            best_avg = avg_similarity
            best_index = idx

    return tickets[best_index].title


def _cluster_confidence_score(cluster_size: int, min_cluster_size: int, average_similarity: float) -> float:
    size_factor = min(1.0, cluster_size / float(min_cluster_size + 3))
    score = 0.6 * size_factor + 0.4 * average_similarity
    return round(float(score), 3)


def detect_massive_incident_candidates(
    all_tickets: Sequence[TicketRecord],
    embedding_model,
    config: DetectionConfig,
    reference_time: Optional[datetime] = None,
) -> List[MassiveIncidentCandidate]:
    """
    Detect potential massive incidents using a simple explainable clustering strategy.

    Strategy:
    1) Keep only recent tickets (time horizon).
    2) Group by service.
    3) Build semantic similarity graph (embeddings + cosine similarity).
    4) Keep links that satisfy both similarity and short time distance.
    5) Extract connected components as incident clusters.
    6) Convert large enough clusters into candidate massive incidents.
    """
    if np is None:
        raise RuntimeError("numpy is required for massive incident detection in full runtime mode")

    if not all_tickets:
        return []

    now = reference_time or datetime.utcnow()
    min_timestamp = now - timedelta(hours=config.hours_back)
    max_delta = timedelta(minutes=config.time_window_minutes)

    recent_tickets = [ticket for ticket in all_tickets if min_timestamp <= ticket.created_at <= now]
    if not recent_tickets:
        return []

    by_service: Dict[str, List[TicketRecord]] = {}
    for ticket in recent_tickets:
        by_service.setdefault(ticket.service_name, []).append(ticket)

    candidates: List[MassiveIncidentCandidate] = []

    for service_name, service_tickets in by_service.items():
        if len(service_tickets) < config.min_cluster_size:
            continue

        texts = [_ticket_text(ticket) for ticket in service_tickets]
        embeddings = embedding_model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
        ).astype("float32")

        # With normalized vectors, dot product equals cosine similarity.
        sim_matrix = np.matmul(embeddings, embeddings.T)
        total = len(service_tickets)

        adjacency: Dict[int, List[int]] = {idx: [] for idx in range(total)}

        for i in range(total):
            for j in range(i + 1, total):
                similarity = float(sim_matrix[i, j])
                time_gap = abs(service_tickets[i].created_at - service_tickets[j].created_at)

                if similarity >= config.similarity_threshold and time_gap <= max_delta:
                    adjacency[i].append(j)
                    adjacency[j].append(i)

        components = _connected_components(adjacency, total)

        for component in components:
            if len(component) < config.min_cluster_size:
                continue

            component_sorted = sorted(component, key=lambda idx: service_tickets[idx].created_at)
            component_tickets = [service_tickets[idx] for idx in component_sorted]
            likely_title = _pick_likely_title(component_sorted, service_tickets, sim_matrix)

            pairwise_scores: List[float] = []
            for pos, idx in enumerate(component_sorted):
                for jdx in component_sorted[pos + 1 :]:
                    pairwise_scores.append(float(sim_matrix[idx, jdx]))
            average_similarity = float(np.mean(pairwise_scores)) if pairwise_scores else 1.0

            score = _cluster_confidence_score(
                cluster_size=len(component_sorted),
                min_cluster_size=config.min_cluster_size,
                average_similarity=average_similarity,
            )

            candidates.append(
                MassiveIncidentCandidate(
                    detected_service=service_name,
                    cluster_size=len(component_sorted),
                    likely_incident_title=likely_title,
                    confidence_level=_confidence_from_score(score),
                    confidence_score=score,
                    cluster_start=component_tickets[0].created_at.isoformat(),
                    cluster_end=component_tickets[-1].created_at.isoformat(),
                    ticket_ids=[ticket.ticket_id for ticket in component_tickets],
                )
            )

    candidates.sort(key=lambda item: (item.cluster_size, item.confidence_score), reverse=True)
    return candidates[: config.max_candidates]
