import sys
from datetime import datetime
from pathlib import Path
import unittest

PROJECT_DIR = Path(__file__).resolve().parents[1]
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from massive_incident_detector import (  # noqa: E402
    DetectionConfig,
    TicketRecord,
    detect_massive_incident_candidates,
)


class FakeEmbeddingModel:
    def encode(self, texts, convert_to_numpy=True, normalize_embeddings=True):
        vectors = []
        for text in texts:
            lowered = text.lower()
            if "bscs" in lowered:
                vectors.append([1.0, 0.0, 0.0])
            elif "crm" in lowered:
                vectors.append([0.0, 1.0, 0.0])
            else:
                vectors.append([0.0, 0.0, 1.0])
        return __import__("numpy").array(vectors, dtype="float32")


class MassiveIncidentDetectorTests(unittest.TestCase):
    def test_detects_massive_incident_candidate_when_cluster_threshold_is_reached(self):
        tickets = [
            TicketRecord(
                ticket_id="1",
                title="Blocage rating BSCS",
                description="Backlog CDR important",
                service_name="BSCS Billing System",
                created_at=datetime(2026, 3, 14, 9, 0, 0),
            ),
            TicketRecord(
                ticket_id="2",
                title="Erreur BSCS sur bill run",
                description="Facturation bloquée",
                service_name="BSCS Billing System",
                created_at=datetime(2026, 3, 14, 9, 30, 0),
            ),
            TicketRecord(
                ticket_id="3",
                title="BSCS indisponible pour valorisation",
                description="CDR non traités",
                service_name="BSCS Billing System",
                created_at=datetime(2026, 3, 14, 10, 0, 0),
            ),
            TicketRecord(
                ticket_id="4",
                title="Désynchronisation CRM",
                description="Impact CRM",
                service_name="CRM Ericsson",
                created_at=datetime(2026, 3, 14, 9, 10, 0),
            ),
        ]

        config = DetectionConfig(
            hours_back=48,
            similarity_threshold=0.7,
            min_cluster_size=3,
            time_window_minutes=180,
            max_candidates=5,
        )

        candidates = detect_massive_incident_candidates(
            all_tickets=tickets,
            embedding_model=FakeEmbeddingModel(),
            config=config,
            reference_time=datetime(2026, 3, 14, 12, 0, 0),
        )

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].detected_service, "BSCS Billing System")
        self.assertEqual(candidates[0].cluster_size, 3)
        self.assertIn("BSCS", candidates[0].likely_incident_title)
        self.assertIn(candidates[0].confidence_level, {"medium", "high"})


if __name__ == "__main__":
    unittest.main()
