import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

import numpy as np

from app import duplicate_detector
from app.schemas import DuplicateRequest, NewTicket, RecentTicket


class Sprint3DuplicateContractTests(unittest.TestCase):
    def test_duplicate_detection_exposes_enriched_contract_fields(self):
        now = datetime.utcnow()
        request = DuplicateRequest(
            new_ticket=NewTicket(
                title="Reseau tres lent sur site principal",
                description="Les clients remontent une lenteur globale.",
                service="Core Network OSS",
                created_at=now,
            ),
            recent_tickets=[
                RecentTicket(
                    id=101,
                    title="Lenteur reseau site principal",
                    description="Impact client fort",
                    service="Core Network OSS",
                    status="OPEN",
                    created_at=now - timedelta(minutes=30),
                ),
                RecentTicket(
                    id=102,
                    title="Probleme CRM isole",
                    description="Un seul utilisateur impacte",
                    service="CRM Ericsson",
                    status="OPEN",
                    created_at=now - timedelta(hours=4),
                ),
            ],
        )

        embeddings = np.array(
            [
                [1.0, 0.0],
                [0.98, 0.02],
                [0.2, 0.8],
            ],
            dtype="float32",
        )

        previous_mode = duplicate_detector._mode
        duplicate_detector._mode = "sentence-transformers"
        try:
            with patch("app.duplicate_detector.encode_texts", return_value=embeddings):
                response = duplicate_detector.detect_duplicates(request)
        finally:
            duplicate_detector._mode = previous_mode

        self.assertTrue(response.available)
        self.assertGreaterEqual(response.duplicate_confidence, 0.0)
        self.assertEqual(response.confidence, response.duplicate_confidence)
        self.assertTrue(response.model_version)
        self.assertIn(response.fallback_mode, {"sentence-transformers", "tfidf", "none"})
        self.assertGreater(len(response.reasoning_steps), 0)
        self.assertGreater(len(response.recommended_actions), 0)
        self.assertGreater(len(response.sources), 0)
        self.assertIsInstance(response.risk_flags, list)


if __name__ == "__main__":
    unittest.main()
