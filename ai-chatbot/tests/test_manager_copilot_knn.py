import json
import sys
import tempfile
from pathlib import Path
import unittest

PROJECT_DIR = Path(__file__).resolve().parents[1]
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from manager_copilot_knn import (  # noqa: E402
    MODEL_VERSION,
    load_seed_examples,
    score_case,
    score_cases_payload,
    train_artifact,
)


class ManagerCopilotKnnTests(unittest.TestCase):
    def _train_temp_artifact(self):
        temp_dir = tempfile.TemporaryDirectory()
        artifact_path = Path(temp_dir.name) / "manager_copilot_knn.json"
        artifact = train_artifact(artifact_path=artifact_path)
        self.addCleanup(temp_dir.cleanup)
        return artifact

    def test_seed_dataset_contains_supported_examples(self):
        examples = load_seed_examples()

        self.assertGreaterEqual(len(examples), 20)
        self.assertIn("OPEN_INCIDENT", {example.label for example in examples})
        self.assertIn("REASSIGN", {example.label for example in examples})

    def test_training_script_produces_local_artifact(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            artifact_path = Path(temp_dir) / "manager_copilot_knn.json"
            artifact = train_artifact(artifact_path=artifact_path)

            self.assertTrue(artifact_path.exists())
            self.assertEqual(artifact["model_version"], MODEL_VERSION)
            self.assertGreaterEqual(len(artifact["training_examples"]), 20)

            persisted = json.loads(artifact_path.read_text(encoding="utf-8"))
            self.assertEqual(
                persisted["dataset_hash"],
                artifact["dataset_hash"],
            )

    def test_knn_scoring_prefers_open_incident_for_clustered_service_case(self):
        artifact = self._train_temp_artifact()
        case = {
            "priority": "HIGH",
            "status": "NEW",
            "age_hours": 4,
            "sla_remaining_minutes": 120,
            "sla_breached": False,
            "service_degraded": True,
            "similar_ticket_count": 5,
            "probable_mass_incident": True,
            "duplicate_confidence": 0.87,
            "frustration_score": 0.58,
            "backlog_open_tickets": 18,
            "agent_open_ticket_count": 0,
            "incident_linked": False,
            "business_impact": "HIGH",
            "service_criticality": "CRITICAL",
            "assigned": False,
        }

        result = score_case(case, artifact)

        self.assertEqual(result["predicted_action"], "OPEN_INCIDENT")
        self.assertEqual(result["inference_mode"], "knn")
        self.assertGreater(result["confidence_score"], 0.45)
        self.assertGreaterEqual(len(result["nearest_examples"]), 1)

    def test_degraded_fallback_remains_deterministic_when_artifact_is_missing(self):
        case = {
            "priority": "HIGH",
            "status": "ASSIGNED",
            "age_hours": 12,
            "sla_remaining_minutes": 180,
            "sla_breached": False,
            "service_degraded": False,
            "similar_ticket_count": 0,
            "probable_mass_incident": False,
            "duplicate_confidence": 0.1,
            "frustration_score": 0.25,
            "backlog_open_tickets": 24,
            "agent_open_ticket_count": 10,
            "incident_linked": False,
            "business_impact": "HIGH",
            "service_criticality": "MEDIUM",
            "assigned": True,
        }

        result = score_case(case, artifact=None)

        self.assertEqual(result["predicted_action"], "REASSIGN")
        self.assertEqual(result["inference_mode"], "degraded_rules")
        self.assertEqual(result["fallback_mode"], "artifact_unavailable")

    def test_batch_scoring_returns_explanations_and_model_metadata(self):
        payload = score_cases_payload(
            cases=[
                {
                    "case_id": "ticket-101",
                    "features": {
                        "priority": "CRITICAL",
                        "status": "IN_PROGRESS",
                        "age_hours": 18,
                        "sla_remaining_minutes": -20,
                        "sla_breached": True,
                        "service_degraded": True,
                        "similar_ticket_count": 2,
                        "probable_mass_incident": False,
                        "duplicate_confidence": 0.4,
                        "frustration_score": 0.82,
                        "backlog_open_tickets": 26,
                        "agent_open_ticket_count": 7,
                        "incident_linked": False,
                        "business_impact": "CRITICAL",
                        "service_criticality": "HIGH",
                        "assigned": True,
                    },
                }
            ],
            artifact=self._train_temp_artifact(),
        )

        self.assertTrue(payload["available"])
        self.assertEqual(len(payload["results"]), 1)
        self.assertIn(payload["inference_mode"], {"knn", "degraded_rules"})
        self.assertTrue(payload["model_version"])
        self.assertGreaterEqual(len(payload["reasoning_steps"]), 1)


if __name__ == "__main__":
    unittest.main()
