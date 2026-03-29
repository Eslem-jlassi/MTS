import unittest

from chat_response_builder import (
    build_answer_from_analysis,
    build_structured_analysis,
    detect_service_context,
    resolve_response_language,
)


class ChatResponseBuilderTest(unittest.TestCase):
    def test_detect_service_context_rejects_ambiguous_service_detection(self):
        service_name, confidence = detect_service_context(
            [
                {"service_name": "CRM Ericsson", "score": 0.42},
                {"service_name": "BSCS Billing System", "score": 0.41},
                {"service_name": "CRM Ericsson", "score": 0.35},
            ],
            top_score=0.42,
        )

        self.assertEqual(service_name, "N/A")
        self.assertEqual(confidence, "low")

    def test_build_structured_analysis_requests_missing_context_for_low_confidence(self):
        analysis = build_structured_analysis(
            question="incident telecom",
            raw_results=[
                {
                    "title": "Perturbation reseau sur cluster nord",
                    "service_name": "Core Network OSS",
                    "content": "Root Cause: Packet loss. Resolution: Restart routing process.",
                    "score": 0.31,
                }
            ],
            confidence="low",
            service_detected="N/A",
        )

        self.assertTrue(analysis.clarification_needed)
        self.assertGreaterEqual(len(analysis.missing_information), 2)
        self.assertIn("brouillon de ticket", analysis.next_action)

    def test_build_answer_from_analysis_contains_professional_sections(self):
        analysis = build_structured_analysis(
            question="Perte de mediation BSCS depuis 09:10, 200 clients impactes",
            raw_results=[
                {
                    "title": "Blocage mediation BSCS",
                    "service_name": "BSCS Billing System",
                    "content": (
                        "Root Cause: Saturation mediation queue. "
                        "Resolution: Restart mediation parser. "
                        "Workaround: Reroute traffic temporarily."
                    ),
                    "score": 0.86,
                }
            ],
            confidence="high",
            service_detected="BSCS Billing System",
        )

        answer = build_answer_from_analysis(analysis)

        self.assertIn("Resume :", answer)
        self.assertIn("Cause probable :", answer)
        self.assertIn("Resolution connue :", answer)
        self.assertIn("Impact :", answer)
        self.assertIn("Action suivante :", answer)

    def test_resolve_response_language_detects_english_query(self):
        language = resolve_response_language(
            "Hello, please analyze this BSCS issue since 09:00 with customer impact."
        )

        self.assertEqual(language, "en")

    def test_build_structured_analysis_supports_english_output(self):
        analysis = build_structured_analysis(
            question="Please analyze this BSCS mediation issue since 09:10 with user impact",
            raw_results=[
                {
                    "title": "BSCS mediation backlog",
                    "service_name": "BSCS Billing System",
                    "content": (
                        "Root Cause: Saturated mediation queue. "
                        "Resolution: Restart mediation parser. "
                        "Workaround: Reroute traffic temporarily."
                    ),
                    "score": 0.86,
                }
            ],
            confidence="high",
            service_detected="BSCS Billing System",
            language="en",
        )

        answer = build_answer_from_analysis(analysis, "en")

        self.assertIn("Summary :", answer)
        self.assertIn("Probable Cause :", answer)
        self.assertIn("Known Resolution :", answer)
        self.assertIn("Next action :", answer)


if __name__ == "__main__":
    unittest.main()
