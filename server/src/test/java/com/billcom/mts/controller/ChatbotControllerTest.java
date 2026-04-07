package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.chatbot.ChatbotAnalysisDto;
import com.billcom.mts.dto.chatbot.ChatbotResponseDto;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.ChatbotService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ChatbotController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class ChatbotControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean(name = "chatbotServiceClient")
    private ChatbotService chatbotService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/chatbot/ask expose le contrat structure du chatbot")
    void ask_returnsStructuredAnalysis() throws Exception {
        ChatbotAnalysisDto analysis = new ChatbotAnalysisDto();
        analysis.setSummary("Un cas proche a ete identifie sur BSCS Billing System.");
        analysis.setImpact("Impact probable sur les utilisateurs du service.");
        analysis.setNextAction("Verifier les incidents similaires puis valider le brouillon.");
        analysis.setClarificationNeeded(false);
        analysis.setMissingInformation(List.of());
        analysis.setDraftTicketTitle("Blocage mediation BSCS");

        ChatbotResponseDto response = new ChatbotResponseDto();
        response.setAvailable(true);
        response.setAnswer("Resume : Un cas proche a ete identifie.");
        response.setConfidence("high");
        response.setTopScore(0.86);
        response.setServiceDetected("BSCS Billing System");
        response.setServiceDetectionConfidence("high");
        response.setResponseLanguage("fr");
        response.setAnalysis(analysis);
        response.setModelVersion("rag-chatbot-1.2.0");
        response.setFallbackMode("rag_primary");
        response.setReasoningSteps(List.of("Top semantic score=0.860 (results_found)."));
        response.setRecommendedActions(List.of("Verifier les incidents similaires sur BSCS Billing System avant changement en production."));
        response.setRiskFlags(List.of("MASS_INCIDENT_CANDIDATE"));
        response.setMissingInformation(List.of("heure de debut"));
        response.setSources(List.of("doc:ticket-001"));
        response.setLatencyMs(165.3);

        when(chatbotService.askChatbot(eq("Analyse incident BSCS"), eq(3), eq("fr"))).thenReturn(response);

        mockMvc.perform(post("/api/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "Analyse incident BSCS",
                                  "top_k": 3,
                                  "preferred_language": "fr"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confidence").value("high"))
                .andExpect(jsonPath("$.service_detected").value("BSCS Billing System"))
                .andExpect(jsonPath("$.service_detection_confidence").value("high"))
                .andExpect(jsonPath("$.response_language").value("fr"))
                .andExpect(jsonPath("$.analysis.summary").value("Un cas proche a ete identifie sur BSCS Billing System."))
                .andExpect(jsonPath("$.analysis.next_action").value("Verifier les incidents similaires puis valider le brouillon."))
                .andExpect(jsonPath("$.analysis.draft_ticket_title").value("Blocage mediation BSCS"))
                .andExpect(jsonPath("$.model_version").value("rag-chatbot-1.2.0"))
                .andExpect(jsonPath("$.fallback_mode").value("rag_primary"))
                .andExpect(jsonPath("$.reasoning_steps[0]").value("Top semantic score=0.860 (results_found)."))
                .andExpect(jsonPath("$.recommended_actions[0]").value("Verifier les incidents similaires sur BSCS Billing System avant changement en production."))
                .andExpect(jsonPath("$.risk_flags[0]").value("MASS_INCIDENT_CANDIDATE"))
                .andExpect(jsonPath("$.missing_information[0]").value("heure de debut"))
                .andExpect(jsonPath("$.sources[0]").value("doc:ticket-001"))
                .andExpect(jsonPath("$.latency_ms").value(165.3));

        verify(chatbotService).askChatbot("Analyse incident BSCS", 3, "fr");
    }

    @Test
    @DisplayName("GET /api/chatbot/health expose l'etat du microservice IA")
    void health_returnsGatewayHealth() throws Exception {
        when(chatbotService.healthCheck()).thenReturn(AiServiceHealthDto.builder()
                .available(true)
                .status("ok")
                .service("ai-chatbot")
                .modelLoaded(true)
                .documentsIndexed(128)
                .build());

        mockMvc.perform(get("/api/chatbot/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("ai-chatbot"))
                .andExpect(jsonPath("$.model_loaded").value(true))
                .andExpect(jsonPath("$.documents_indexed").value(128));
    }
}
