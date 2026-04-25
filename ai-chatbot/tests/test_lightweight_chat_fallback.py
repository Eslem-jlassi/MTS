import unittest

from lightweight_chat_fallback import infer_service_from_query, load_lightweight_chat_cases, search_lightweight_chat_cases


class LightweightChatFallbackTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = load_lightweight_chat_cases()

    def test_infers_bscs_service_from_billing_query(self):
        service_name, confidence = infer_service_from_query("erreur facturation BSCS sur les CDR")

        self.assertEqual(service_name, "BSCS Billing System")
        self.assertIn(confidence, {"medium", "high"})

    def test_returns_crm_case_for_crm_query(self):
        results = search_lightweight_chat_cases("probleme CRM sur les fiches clients", self.cases, top_k=3)

        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["service_name"], "CRM Ericsson")

    def test_returns_voip_case_for_voip_query(self):
        results = search_lightweight_chat_cases("incident VoIP avec echo sur les appels", self.cases, top_k=3)

        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["service_name"], "VoIP Platform")

    def test_network_and_billing_queries_do_not_return_same_top_case(self):
        network_results = search_lightweight_chat_cases("panne reseau core network", self.cases, top_k=1)
        billing_results = search_lightweight_chat_cases("erreur facturation BSCS", self.cases, top_k=1)

        self.assertGreater(len(network_results), 0)
        self.assertGreater(len(billing_results), 0)
        self.assertNotEqual(network_results[0]["title"], billing_results[0]["title"])


if __name__ == "__main__":
    unittest.main()
