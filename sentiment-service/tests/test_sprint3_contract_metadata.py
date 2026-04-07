import unittest

from app.classifier import classify_ticket
from app.schemas import ClassificationRequest


class Sprint3SentimentContractTests(unittest.TestCase):
    def test_classification_exposes_enriched_contract_fields(self):
        request = ClassificationRequest(
            title="Reseau tres lent depuis 09:00",
            description="Le site principal est impacte et plusieurs clients sont bloques.",
        )

        response = classify_ticket(request)

        self.assertTrue(response.available)
        self.assertGreaterEqual(response.confidence, 0.0)
        self.assertTrue(response.model_version)
        self.assertIn(response.fallback_mode, {"hybrid", "rules_only"})
        self.assertGreater(len(response.reasoning_steps), 0)
        self.assertGreater(len(response.recommended_actions), 0)
        self.assertGreater(len(response.sources), 0)

    def test_classification_detects_missing_context_for_sparse_ticket(self):
        request = ClassificationRequest(
            title="Incident",
            description="",
        )

        response = classify_ticket(request)

        self.assertIn("description detaillee des symptomes observes", response.missing_information)
        self.assertIn("service telecom suspect", response.missing_information)
        self.assertIsInstance(response.risk_flags, list)


if __name__ == "__main__":
    unittest.main()
