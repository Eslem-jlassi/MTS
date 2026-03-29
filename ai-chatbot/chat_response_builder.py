from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


SERVICE_HINT_MARKERS = (
    "bscs",
    "billing",
    "crm",
    "voip",
    "core",
    "network",
    "reseau",
    "mediation",
    "internet",
    "oss",
    "data",
)

SYMPTOM_HINT_MARKERS = (
    "incident",
    "panne",
    "erreur",
    "ko",
    "hs",
    "slow",
    "lent",
    "latence",
    "timeout",
    "indisponible",
    "failure",
    "probleme",
    "alarm",
    "alarme",
)

IMPACT_HINT_MARKERS = (
    "client",
    "utilisateur",
    "user",
    "impact",
    "zone",
    "region",
    "site",
    "agence",
    "volume",
    "massif",
    "general",
)

TIME_HINT_PATTERN = re.compile(
    r"\b(depuis|since|a\s+\d{1,2}h|vers\s+\d{1,2}h|\d{1,2}:\d{2}|heure|minutes?|minute|today|aujourd'hui|ce matin|cet apres-midi)\b",
    re.IGNORECASE,
)

FIELD_LABELS: Dict[str, Sequence[str]] = {
    "probable_cause": ("Root Cause", "Probable Cause", "Cause probable", "Cause racine"),
    "known_resolution": (
        "Resolution",
        "Recommended Action",
        "Action recommandee",
        "Resolution connue",
        "Final Resolution",
    ),
    "workaround": ("Workaround", "Possible Workaround", "Contournement", "Contournement possible"),
}

FRENCH_LANGUAGE_MARKERS = (
    "bonjour",
    "incident",
    "panne",
    "service",
    "depuis",
    "utilisateur",
    "impact",
    "risque",
    "merci",
    "analyse",
)

ENGLISH_LANGUAGE_MARKERS = (
    "hello",
    "issue",
    "incident",
    "service",
    "since",
    "user",
    "impact",
    "risk",
    "thanks",
    "analyze",
)


@dataclass(frozen=True)
class StructuredAnalysis:
    summary: str
    probable_cause: Optional[str]
    known_resolution: Optional[str]
    workaround: Optional[str]
    impact: str
    next_action: str
    clarification_needed: bool
    missing_information: List[str]
    caution: Optional[str]
    draft_ticket_title: Optional[str]


def clean_text(value: Optional[str]) -> str:
    if not value:
        return ""

    cleaned = str(value).strip()
    if cleaned.lower() == "nan":
        return ""

    return re.sub(r"\s+", " ", cleaned).strip(" .")


def resolve_response_language(question: str, preferred_language: Optional[str] = None) -> str:
    normalized_preference = clean_text(preferred_language).lower()
    if normalized_preference in {"fr", "en"}:
        return normalized_preference

    normalized_question = clean_text(question).lower()
    if not normalized_question:
        return "fr"

    french_score = sum(1 for marker in FRENCH_LANGUAGE_MARKERS if marker in normalized_question)
    english_score = sum(1 for marker in ENGLISH_LANGUAGE_MARKERS if marker in normalized_question)

    if english_score > french_score:
        return "en"

    if french_score > english_score:
        return "fr"

    if re.search(r"\b(the|this|that|please|with|from|since)\b", normalized_question):
        return "en"

    if re.search(r"\b(le|la|les|des|avec|depuis|pour)\b", normalized_question):
        return "fr"

    return "fr"


def extract_field(text: str, field_names: Iterable[str]) -> str:
    cleaned_text = clean_text(text)
    if not cleaned_text:
        return ""

    escaped_labels = [re.escape(label) for label in field_names]
    pattern = re.compile(
        rf"(?:^|[\n.])\s*(?:{'|'.join(escaped_labels)})\s*:\s*([^\n.]+)",
        re.IGNORECASE,
    )
    match = pattern.search(cleaned_text)
    if not match:
        return ""

    return clean_text(match.group(1))


def score_to_confidence(score: float) -> str:
    if score >= 0.55:
        return "high"
    if score >= 0.40:
        return "medium"
    return "low"


def deduplicate_results(raw_results: Sequence[dict]) -> List[dict]:
    seen = set()
    cleaned: List[dict] = []

    for doc in raw_results:
        title = clean_text(doc.get("title", "")).lower().replace(" lot secondaire", "")
        key = (
            clean_text(doc.get("doc_type", "")).lower(),
            title,
            clean_text(doc.get("service_name", "")).lower(),
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(doc)

    return cleaned


def detect_service_context(raw_results: Sequence[dict], top_score: float) -> Tuple[str, str]:
    service_scores: Dict[str, float] = {}
    service_support: Dict[str, int] = {}

    for index, result in enumerate(raw_results[:3]):
        service_name = clean_text(result.get("service_name", ""))
        if not service_name:
            continue

        raw_score = float(result.get("score", 0.0))
        position_weight = 1.0 if index == 0 else 0.85 if index == 1 else 0.7
        weighted_score = raw_score * position_weight
        service_scores[service_name] = service_scores.get(service_name, 0.0) + weighted_score

        if raw_score >= max(0.22, top_score - 0.15):
            service_support[service_name] = service_support.get(service_name, 0) + 1

    if not service_scores:
        return ("N/A", "low")

    ordered_services = sorted(service_scores.items(), key=lambda item: item[1], reverse=True)
    detected_service, detected_score = ordered_services[0]
    second_score = ordered_services[1][1] if len(ordered_services) > 1 else 0.0
    total_score = sum(service_scores.values())
    score_share = detected_score / total_score if total_score > 0 else 0.0
    support_count = service_support.get(detected_service, 0)

    if top_score >= 0.55 and score_share >= 0.50 and detected_score >= (second_score * 1.15):
        confidence = "high"
    elif (
        top_score >= 0.45
        and score_share >= 0.42
        and support_count >= 1
        and detected_score >= (second_score * 1.10)
    ):
        confidence = "medium"
    else:
        confidence = "low"

    if confidence == "low":
        return ("N/A", "low")

    return (detected_service, confidence)


def _normalize_query(question: str) -> str:
    return re.sub(r"\s+", " ", clean_text(question).lower())


def _contains_any_marker(question: str, markers: Iterable[str]) -> bool:
    normalized = _normalize_query(question)
    return any(marker in normalized for marker in markers)


def build_missing_information(question: str, service_detected: str, language: str = "fr") -> List[str]:
    missing: List[str] = []
    is_english = language == "en"

    if service_detected == "N/A":
        missing.append("impacted service" if is_english else "service impacte")

    if not _contains_any_marker(question, SYMPTOM_HINT_MARKERS) or len(_normalize_query(question).split()) < 5:
        missing.append(
            "observed symptoms or error message"
            if is_english
            else "symptomes observes ou message d'erreur"
        )

    if not TIME_HINT_PATTERN.search(question):
        missing.append(
            "start time or issue duration"
            if is_english
            else "heure de debut ou duree du probleme"
        )

    if not _contains_any_marker(question, IMPACT_HINT_MARKERS):
        missing.append(
            "affected users or impacted customer scope"
            if is_english
            else "perimetre utilisateur ou clients touches"
        )

    if not _contains_any_marker(question, SERVICE_HINT_MARKERS) and service_detected == "N/A":
        missing.append(
            "suspected telecom component or service"
            if is_english
            else "composant ou service telecom suspect"
        )

    return missing[:4]


def _build_summary(
    confidence: str,
    top_title: str,
    service_detected: str,
    has_results: bool,
    language: str = "fr",
) -> str:
    is_english = language == "en"
    if not has_results:
        return (
            "No sufficiently similar case was found in the knowledge base."
            if is_english
            else "Aucun cas suffisamment proche n'a ete retrouve dans la base de connaissances."
        )

    if confidence == "low":
        title_hint = (
            f" Closest reference: {top_title}."
            if top_title and is_english
            else f" Reference la plus proche : {top_title}."
            if top_title
            else ""
        )
        return (
            "The AI engine found partially similar cases, but the diagnosis remains cautious."
            if is_english
            else "Le moteur IA a retrouve des cas partiellement similaires, mais le diagnostic reste prudent."
        ) + title_hint

    service_hint = service_detected if service_detected != "N/A" else "le service suspect"
    title_hint = top_title or "cas similaire sans titre exploitable"
    if is_english:
        service_hint = service_detected if service_detected != "N/A" else "the suspected service"
        title_hint = top_title or "similar case without an actionable title"
        return f"A similar case was identified on {service_hint}. Main reference: {title_hint}."

    return f"Un cas proche a ete identifie sur {service_hint}. Reference principale : {title_hint}."


def _build_impact(service_detected: str, confidence: str, has_results: bool, language: str = "fr") -> str:
    is_english = language == "en"
    if not has_results:
        return (
            "Impact is not confirmed yet. The affected user scope must be documented before escalation."
            if is_english
            else "Impact non confirme a ce stade. Le perimetre utilisateur doit etre documente avant escalation."
        )

    if service_detected == "N/A":
        return (
            "Impact is not confirmed yet. The exact service and user scope must be verified."
            if is_english
            else "Impact non confirme a ce stade. Le service exact et le perimetre utilisateur doivent etre verifies."
        )

    if confidence == "high":
        return (
            f"Probable impact on users of service {service_detected}. "
            "Quickly verify the affected area, impacted customer volume and SLA risk."
            if is_english
            else f"Impact probable sur les utilisateurs du service {service_detected}. "
            "Verifier rapidement la zone touchee, le volume de clients impactes et le risque SLA."
        )

    if confidence == "medium":
        return (
            f"Probable impact on service {service_detected}, but the real scope still has to be confirmed. "
            "Verify the affected users and any symptoms still active."
            if is_english
            else f"Impact probable sur le service {service_detected}, mais le perimetre reel reste a confirmer. "
            "Verifier les utilisateurs touches et les symptomes encore actifs."
        )

    return (
        f"Service {service_detected} is a plausible lead, but the real impact remains uncertain. "
        "Confirm the scope before taking action in production."
        if is_english
        else f"Le service {service_detected} est une piste plausible, mais l'impact reel reste incertain. "
        "Confirmer le perimetre avant action en production."
    )


def _build_next_action(
    confidence: str,
    service_detected: str,
    known_resolution: str,
    missing_information: Sequence[str],
    language: str = "fr",
) -> str:
    is_english = language == "en"
    if confidence == "low":
        return (
            "Complete the context (service, symptoms, start time, impact), review similar cases "
            "and prepare only a human-validated ticket draft."
            if is_english
            else "Completer le contexte (service, symptomes, heure de debut, impact), verifier les cas similaires "
            "puis preparer seulement un brouillon de ticket valide par un humain."
        )

    if known_resolution:
        if is_english:
            service_hint = service_detected if service_detected != "N/A" else "the target service"
            return (
                f"Confirm that the context matches on {service_hint}, review similar incidents "
                "and cautiously apply the known resolution if it fits the current situation."
            )

        service_hint = service_detected if service_detected != "N/A" else "le service cible"
        return (
            f"Confirmer que le contexte correspond sur {service_hint}, verifier les incidents similaires "
            "puis appliquer prudemment la resolution connue si elle est compatible avec la situation en cours."
        )

    if missing_information:
        return (
            "Review similar cases, complete the missing information and prepare escalation "
            "if SLA risk increases."
            if is_english
            else "Verifier les cas similaires, completer les informations manquantes puis preparer l'escalade "
            "si le risque SLA augmente."
        )

    return (
        "Review similar incidents, confirm the impact on the service and prepare the next operational actions "
        "with the relevant support team."
        if is_english
        else "Verifier les incidents similaires, confirmer l'impact sur le service puis preparer les prochaines actions "
        "operationnelles avec le support concerne."
    )


def _build_caution(confidence: str, missing_information: Sequence[str], language: str = "fr") -> Optional[str]:
    is_english = language == "en"
    if confidence == "low":
        return (
            "Heuristic diagnosis to be confirmed before any action in production."
            if is_english
            else "Diagnostic heuristique a confirmer avant toute action en production."
        )

    if confidence == "medium" and missing_information:
        return (
            "Several indicators are consistent, but human validation is still recommended before escalation."
            if is_english
            else "Plusieurs indices sont coherents, mais la validation humaine reste recommandee avant escalade."
        )

    return None


def build_structured_analysis(
    question: str,
    raw_results: Sequence[dict],
    confidence: str,
    service_detected: str,
    language: str = "fr",
) -> StructuredAnalysis:
    top_result = raw_results[0] if raw_results else {}
    top_title = clean_text(top_result.get("title", ""))
    top_content = clean_text(top_result.get("content", ""))
    probable_cause = extract_field(top_content, FIELD_LABELS["probable_cause"])
    known_resolution = extract_field(top_content, FIELD_LABELS["known_resolution"])
    workaround = extract_field(top_content, FIELD_LABELS["workaround"])

    missing_information = build_missing_information(question, service_detected, language)
    has_results = len(raw_results) > 0
    summary = _build_summary(confidence, top_title, service_detected, has_results, language)
    impact = _build_impact(service_detected, confidence, has_results, language)
    next_action = _build_next_action(
        confidence,
        service_detected,
        known_resolution,
        missing_information,
        language,
    )
    caution = _build_caution(confidence, missing_information, language)
    clarification_needed = confidence == "low" or len(missing_information) > 0

    draft_ticket_title = top_title
    if not draft_ticket_title:
        if service_detected != "N/A":
            draft_ticket_title = (
                f"Incident to confirm on {service_detected}"
                if language == "en"
                else f"Incident a confirmer sur {service_detected}"
            )
        else:
            draft_ticket_title = (
                "Telecom incident to qualify"
                if language == "en"
                else "Incident telecom a qualifier"
            )

    return StructuredAnalysis(
        summary=summary,
        probable_cause=probable_cause or None,
        known_resolution=known_resolution or None,
        workaround=workaround or None,
        impact=impact,
        next_action=next_action,
        clarification_needed=clarification_needed,
        missing_information=missing_information,
        caution=caution,
        draft_ticket_title=draft_ticket_title,
    )


def build_answer_from_analysis(analysis: StructuredAnalysis, language: str = "fr") -> str:
    is_english = language == "en"
    lines = [f"{'Summary' if is_english else 'Resume'} : {analysis.summary}"]

    if analysis.probable_cause:
        lines.append(
            f"{'Probable Cause' if is_english else 'Cause probable'} : {analysis.probable_cause}"
        )

    if analysis.known_resolution:
        lines.append(
            f"{'Known Resolution' if is_english else 'Resolution connue'} : {analysis.known_resolution}"
        )

    if analysis.workaround:
        lines.append(f"{'Workaround' if is_english else 'Contournement'} : {analysis.workaround}")

    lines.append(f"{'Impact' if is_english else 'Impact'} : {analysis.impact}")
    lines.append(f"{'Next action' if is_english else 'Action suivante'} : {analysis.next_action}")

    if analysis.missing_information:
        lines.append(
            (
                "Information to confirm: "
                if is_english
                else "Informations a confirmer : "
            )
            + ", ".join(item for item in analysis.missing_information if item)
        )

    if analysis.caution:
        lines.append(f"{'Caution' if is_english else 'Note de prudence'} : {analysis.caution}")

    return "\n".join(lines)
