import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "manager_copilot_knn_seed.csv"
ARTIFACT_DIR = BASE_DIR / "models"
ARTIFACT_PATH = ARTIFACT_DIR / "manager_copilot_knn.json"
MODEL_VERSION = "manager-copilot-knn-1.0.0"
DEFAULT_K = 5

NUMERIC_FEATURES = [
    "age_hours",
    "sla_remaining_minutes",
    "similar_ticket_count",
    "duplicate_confidence",
    "frustration_score",
    "backlog_open_tickets",
    "agent_open_ticket_count",
]

BOOLEAN_FEATURES = [
    "sla_breached",
    "service_degraded",
    "probable_mass_incident",
    "incident_linked",
    "assigned",
]

CATEGORICAL_FEATURES = [
    "priority",
    "status",
    "business_impact",
    "service_criticality",
]

SUPPORTED_ACTIONS = [
    "ESCALATE",
    "REASSIGN",
    "OPEN_INCIDENT",
    "MONITOR",
    "PREPARE_SUMMARY",
]

ACTION_LABELS = {
    "ESCALATE": "Escalader",
    "REASSIGN": "Reassigner",
    "OPEN_INCIDENT": "Ouvrir un incident",
    "MONITOR": "Surveiller",
    "PREPARE_SUMMARY": "Preparer une synthese",
}


@dataclass
class TrainingExample:
    example_id: str
    label: str
    title: str
    summary: str
    recommendation: str
    raw_features: Dict[str, Any]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_categorical(value: Any, default: str = "UNKNOWN") -> str:
    if value is None:
        return default
    text = str(value).strip().upper()
    return text or default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "y", "oui"}


def _dataset_hash(dataset_path: Path) -> str:
    digest = hashlib.sha256()
    with dataset_path.open("rb") as dataset_file:
        digest.update(dataset_file.read())
    return digest.hexdigest()


def load_seed_examples(dataset_path: Path = DATASET_PATH) -> List[TrainingExample]:
    examples: List[TrainingExample] = []
    with dataset_path.open("r", encoding="utf-8", newline="") as dataset_file:
        reader = csv.DictReader(dataset_file)
        for row in reader:
            label = _normalize_categorical(row.get("label"))
            if label not in SUPPORTED_ACTIONS:
                raise ValueError(f"Unsupported label in dataset: {label}")

            raw_features = {
                feature: _to_float(row.get(feature))
                for feature in NUMERIC_FEATURES
            }
            raw_features.update(
                {
                    feature: 1.0 if _to_bool(row.get(feature)) else 0.0
                    for feature in BOOLEAN_FEATURES
                }
            )
            raw_features.update(
                {
                    feature: _normalize_categorical(row.get(feature))
                    for feature in CATEGORICAL_FEATURES
                }
            )

            examples.append(
                TrainingExample(
                    example_id=str(row.get("example_id") or "").strip(),
                    label=label,
                    title=str(row.get("title") or "").strip(),
                    summary=str(row.get("summary") or "").strip(),
                    recommendation=str(row.get("recommendation") or "").strip(),
                    raw_features=raw_features,
                )
            )

    if not examples:
        raise ValueError("Manager copilot dataset is empty")
    return examples


def _build_preprocessor(examples: List[TrainingExample]) -> Dict[str, Any]:
    # Numeric and boolean features are standardized so Euclidean distance is not
    # dominated by a single large-scale variable such as age or SLA minutes.
    numeric_stats: Dict[str, Dict[str, float]] = {}
    for feature in NUMERIC_FEATURES + BOOLEAN_FEATURES:
        values = [_to_float(example.raw_features.get(feature)) for example in examples]
        mean_value = sum(values) / len(values)
        variance = sum((value - mean_value) ** 2 for value in values) / len(values)
        std_value = math.sqrt(variance) or 1.0
        numeric_stats[feature] = {
            "mean": mean_value,
            "std": std_value,
        }

    categorical_values: Dict[str, List[str]] = {}
    for feature in CATEGORICAL_FEATURES:
        categories = sorted({_normalize_categorical(example.raw_features.get(feature)) for example in examples})
        categorical_values[feature] = categories or ["UNKNOWN"]

    return {
        "numeric_stats": numeric_stats,
        "categorical_values": categorical_values,
    }


def _encode_features(raw_features: Dict[str, Any], preprocessor: Dict[str, Any]) -> List[float]:
    # The feature vector is intentionally explicit and explainable:
    # - standardized numeric/boolean telemetry
    # - one-hot encoded categorical business states
    vector: List[float] = []

    numeric_stats = preprocessor["numeric_stats"]
    categorical_values = preprocessor["categorical_values"]

    for feature in NUMERIC_FEATURES + BOOLEAN_FEATURES:
        value = _to_float(raw_features.get(feature))
        stats = numeric_stats[feature]
        vector.append((value - stats["mean"]) / (stats["std"] or 1.0))

    for feature in CATEGORICAL_FEATURES:
        normalized_value = _normalize_categorical(raw_features.get(feature))
        for category in categorical_values[feature]:
            vector.append(1.0 if normalized_value == category else 0.0)

    return vector


def train_artifact(
    dataset_path: Path = DATASET_PATH,
    artifact_path: Path = ARTIFACT_PATH,
    model_version: str = MODEL_VERSION,
) -> Dict[str, Any]:
    examples = load_seed_examples(dataset_path)
    preprocessor = _build_preprocessor(examples)

    training_examples: List[Dict[str, Any]] = []
    for example in examples:
        training_examples.append(
            {
                "example_id": example.example_id,
                "label": example.label,
                "title": example.title,
                "summary": example.summary,
                "recommendation": example.recommendation,
                "raw_features": example.raw_features,
                "encoded_features": _encode_features(example.raw_features, preprocessor),
            }
        )

    artifact = {
        "model_version": model_version,
        "trained_at": _now_iso(),
        "dataset_path": str(dataset_path.relative_to(BASE_DIR)),
        "dataset_hash": _dataset_hash(dataset_path),
        "k": DEFAULT_K,
        "numeric_features": NUMERIC_FEATURES,
        "boolean_features": BOOLEAN_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "preprocessor": preprocessor,
        "training_examples": training_examples,
    }

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(artifact, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )
    return artifact


def load_or_train_artifact(
    artifact_path: Path = ARTIFACT_PATH,
    dataset_path: Path = DATASET_PATH,
) -> Dict[str, Any]:
    expected_hash = _dataset_hash(dataset_path)

    if artifact_path.exists():
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        if artifact.get("dataset_hash") == expected_hash:
            return artifact

    return train_artifact(dataset_path=dataset_path, artifact_path=artifact_path)


def _euclidean_distance(left: List[float], right: List[float]) -> float:
    # Lightweight KNN distance for a defense-ready first version:
    # same preprocessing + Euclidean distance => readable neighbor search.
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def _confidence_level(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


def _summarize_features(raw_features: Dict[str, Any]) -> List[str]:
    summary: List[str] = []

    priority = _normalize_categorical(raw_features.get("priority"))
    if priority in {"CRITICAL", "HIGH"}:
        summary.append(f"Priorite {priority}")

    sla_remaining_minutes = _to_float(raw_features.get("sla_remaining_minutes"))
    if _to_bool(raw_features.get("sla_breached")):
        summary.append(f"SLA depasse de {abs(round(sla_remaining_minutes))} min")
    elif sla_remaining_minutes <= 90:
        summary.append(f"SLA restant {round(max(sla_remaining_minutes, 0.0))} min")

    if _to_bool(raw_features.get("service_degraded")):
        summary.append("Service degrade ou indisponible")

    similar_ticket_count = _to_float(raw_features.get("similar_ticket_count"))
    if similar_ticket_count >= 2:
        summary.append(f"{int(similar_ticket_count)} ticket(s) similaires")

    if _to_bool(raw_features.get("probable_mass_incident")):
        summary.append("Signal incident massif probable")

    duplicate_confidence = _to_float(raw_features.get("duplicate_confidence"))
    if duplicate_confidence >= 0.7:
        summary.append(f"Score doublon eleve ({duplicate_confidence:.2f})")

    frustration_score = _to_float(raw_features.get("frustration_score"))
    if frustration_score >= 0.7:
        summary.append(f"Frustration client elevee ({frustration_score:.2f})")

    agent_open_ticket_count = _to_float(raw_features.get("agent_open_ticket_count"))
    if agent_open_ticket_count >= 7:
        summary.append(f"Charge agent elevee ({int(agent_open_ticket_count)} tickets)")

    if _to_bool(raw_features.get("incident_linked")):
        summary.append("Incident deja relie au service")

    if not summary:
        summary.append("Aucun signal dominant au-dessus du bruit operationnel")

    return summary


def _build_reasoning(
    predicted_action: str,
    neighbors: List[Dict[str, Any]],
    confidence_score: float,
) -> str:
    if not neighbors:
        return "Aucun voisin n'a pu etre charge. Verification manager requise."

    action_counts = Counter(neighbor["label"] for neighbor in neighbors)
    dominant_count = action_counts.get(predicted_action, 0)
    top_neighbor = neighbors[0]

    return (
        f"L'action {ACTION_LABELS.get(predicted_action, predicted_action)} ressort sur "
        f"{dominant_count}/{len(neighbors)} voisin(s) proches. "
        f"Cas le plus proche: {top_neighbor['title']} "
        f"(distance={top_neighbor['distance']:.3f}, confiance={confidence_score:.2f})."
    )


def _fallback_prediction(raw_features: Dict[str, Any]) -> Dict[str, Any]:
    sla_remaining = _to_float(raw_features.get("sla_remaining_minutes"))
    similar_ticket_count = _to_float(raw_features.get("similar_ticket_count"))
    agent_open = _to_float(raw_features.get("agent_open_ticket_count"))
    backlog = _to_float(raw_features.get("backlog_open_tickets"))
    frustration = _to_float(raw_features.get("frustration_score"))
    probable_mass_incident = _to_bool(raw_features.get("probable_mass_incident"))
    service_degraded = _to_bool(raw_features.get("service_degraded"))
    incident_linked = _to_bool(raw_features.get("incident_linked"))
    assigned = _to_bool(raw_features.get("assigned"))
    priority = _normalize_categorical(raw_features.get("priority"))

    predicted_action = "MONITOR"
    confidence_score = 0.55

    if probable_mass_incident or (service_degraded and similar_ticket_count >= 3):
        predicted_action = "OPEN_INCIDENT"
        confidence_score = 0.82 if probable_mass_incident else 0.72
    elif _to_bool(raw_features.get("sla_breached")) or sla_remaining < 0:
        predicted_action = "ESCALATE"
        confidence_score = 0.8
    elif assigned and agent_open >= 8 and backlog >= 18:
        predicted_action = "REASSIGN"
        confidence_score = 0.68
    elif priority == "CRITICAL" and (frustration >= 0.75 or incident_linked):
        predicted_action = "PREPARE_SUMMARY"
        confidence_score = 0.64

    reasoning = (
        "Mode degrade actif: la recommandation repose sur des regles deterministes "
        "fondees sur le SLA, la charge, les doublons et le contexte incident."
    )

    return {
        "predicted_action": predicted_action,
        "confidence_score": confidence_score,
        "confidence_level": _confidence_level(confidence_score),
        "nearest_examples": [],
        "feature_summary": _summarize_features(raw_features),
        "reasoning": reasoning,
        "inference_mode": "degraded_rules",
        "model_version": MODEL_VERSION,
        "fallback_mode": "artifact_unavailable",
    }


def score_case(
    raw_features: Dict[str, Any],
    artifact: Optional[Dict[str, Any]],
    k: Optional[int] = None,
) -> Dict[str, Any]:
    if not artifact:
        return _fallback_prediction(raw_features)

    encoded_features = _encode_features(raw_features, artifact["preprocessor"])
    all_examples = artifact["training_examples"]
    neighbor_count = min(k or artifact.get("k", DEFAULT_K), len(all_examples))

    ranked_neighbors: List[Dict[str, Any]] = []
    for example in all_examples:
        distance = _euclidean_distance(encoded_features, example["encoded_features"])
        ranked_neighbors.append(
            {
                "example_id": example["example_id"],
                "label": example["label"],
                "title": example["title"],
                "summary": example["summary"],
                "recommendation": example["recommendation"],
                "distance": distance,
                "raw_features": example["raw_features"],
            }
        )

    ranked_neighbors.sort(key=lambda item: item["distance"])
    nearest_neighbors = ranked_neighbors[:neighbor_count]

    weighted_votes: Dict[str, float] = defaultdict(float)
    for neighbor in nearest_neighbors:
        # Weighted vote: the closer a neighbor is, the more it influences the
        # decision. This keeps the output interpretable for managers and jury.
        weight = 1.0 / (neighbor["distance"] + 1e-6)
        weighted_votes[neighbor["label"]] += weight

    predicted_action = max(weighted_votes.items(), key=lambda item: item[1])[0]
    total_weight = sum(weighted_votes.values()) or 1.0
    # Confidence is the share of weighted votes captured by the winning class.
    # It is deterministic and directly explainable from neighbor distances.
    confidence_score = weighted_votes[predicted_action] / total_weight

    return {
        "predicted_action": predicted_action,
        "confidence_score": round(confidence_score, 4),
        "confidence_level": _confidence_level(confidence_score),
        "nearest_examples": [
            {
                "example_id": neighbor["example_id"],
                "label": neighbor["label"],
                "title": neighbor["title"],
                "summary": neighbor["summary"],
                "recommendation": neighbor["recommendation"],
                "distance": round(neighbor["distance"], 4),
                "feature_summary": _summarize_features(neighbor["raw_features"]),
            }
            for neighbor in nearest_neighbors[:3]
        ],
        "feature_summary": _summarize_features(raw_features),
        "reasoning": _build_reasoning(predicted_action, nearest_neighbors[:3], confidence_score),
        "inference_mode": "knn",
        "model_version": artifact.get("model_version", MODEL_VERSION),
        "fallback_mode": "knn_primary",
    }


def build_case_features(payload: Dict[str, Any]) -> Dict[str, Any]:
    features = payload.get("features", payload)
    normalized: Dict[str, Any] = {}

    for feature in NUMERIC_FEATURES:
        normalized[feature] = _to_float(features.get(feature))
    for feature in BOOLEAN_FEATURES:
        normalized[feature] = 1.0 if _to_bool(features.get(feature)) else 0.0
    for feature in CATEGORICAL_FEATURES:
        normalized[feature] = _normalize_categorical(features.get(feature))

    return normalized


def score_cases_payload(
    cases: List[Dict[str, Any]],
    artifact: Optional[Dict[str, Any]] = None,
    k: Optional[int] = None,
) -> Dict[str, Any]:
    loaded_artifact = artifact
    fallback_mode = "knn_primary"
    if loaded_artifact is None:
        try:
            loaded_artifact = load_or_train_artifact()
        except Exception:
            loaded_artifact = None
            fallback_mode = "artifact_unavailable"

    results = []
    for case in cases:
        raw_features = build_case_features(case)
        prediction = score_case(raw_features, loaded_artifact, k)
        results.append(
            {
                "case_id": case.get("case_id") or case.get("ticket_number") or case.get("title") or "case",
                "predicted_action": prediction["predicted_action"],
                "confidence_score": prediction["confidence_score"],
                "confidence_level": prediction["confidence_level"],
                "nearest_examples": prediction["nearest_examples"],
                "feature_summary": prediction["feature_summary"],
                "reasoning": prediction["reasoning"],
                "inference_mode": prediction["inference_mode"],
                "model_version": prediction["model_version"],
                "fallback_mode": prediction["fallback_mode"],
            }
        )

    aggregate_confidence = (
        sum(result["confidence_score"] for result in results) / len(results) if results else 0.0
    )

    return {
        "available": True,
        "model_version": (loaded_artifact or {}).get("model_version", MODEL_VERSION),
        "inference_mode": "knn" if loaded_artifact else "degraded_rules",
        "fallback_mode": fallback_mode,
        "confidence_score": round(aggregate_confidence, 4),
        "confidence_level": _confidence_level(aggregate_confidence),
        "results": results,
        "reasoning_steps": [
            f"KNN supervise execute sur {len(results)} cas manager.",
            f"Dataset seed charge depuis {DATASET_PATH.name}.",
            "Les recommandations restent des aides a la decision, validation finale manager requise.",
        ],
    }
