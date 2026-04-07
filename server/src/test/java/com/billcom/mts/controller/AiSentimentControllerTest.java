package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.ai.SentimentAnalysisResponseDto;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.SentimentAnalysisService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiSentimentController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class AiSentimentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SentimentAnalysisService sentimentAnalysisService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/ai/sentiment/analyze expose le contrat enrichi Sprint 3 sans casser le legacy")
    void analyze_returnsUnifiedContract() throws Exception {
        SentimentAnalysisResponseDto response = new SentimentAnalysisResponseDto();
        response.setAvailable(true);
        response.setCategory("PANNE_RESEAU");
        response.setPriority("HIGH");
        response.setService("CORE_NETWORK");
        response.setUrgency("ELEVATED");
        response.setSentiment("NEGATIVE");
        response.setCriticality("HIGH");
        response.setConfidence(0.82);
        response.setReasoning("Mots-cles reseau detectes.");
        response.setModelVersion("sentiment-hybrid-2.1.0");
        response.setFallbackMode("hybrid");
        response.setReasoningSteps(List.of("Categorie detectee=PANNE_RESEAU."));
        response.setRecommendedActions(List.of("Escalader vers N2/N3."));
        response.setRiskFlags(List.of("HIGH_CRITICALITY"));
        response.setMissingInformation(List.of("heure de debut ou duree du probleme"));
        response.setSources(List.of("rules-engine:v2"));
        response.setLatencyMs(121.4);

        when(sentimentAnalysisService.analyze(any())).thenReturn(response);

        mockMvc.perform(post("/api/ai/sentiment/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Reseau lent",
                                  "description": "Impact client important"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("PANNE_RESEAU"))
                .andExpect(jsonPath("$.reasoning").value("Mots-cles reseau detectes."))
                .andExpect(jsonPath("$.model_version").value("sentiment-hybrid-2.1.0"))
                .andExpect(jsonPath("$.fallback_mode").value("hybrid"))
                .andExpect(jsonPath("$.reasoning_steps[0]").value("Categorie detectee=PANNE_RESEAU."))
                .andExpect(jsonPath("$.recommended_actions[0]").value("Escalader vers N2/N3."))
                .andExpect(jsonPath("$.risk_flags[0]").value("HIGH_CRITICALITY"))
                .andExpect(jsonPath("$.missing_information[0]").value("heure de debut ou duree du probleme"))
                .andExpect(jsonPath("$.sources[0]").value("rules-engine:v2"))
                .andExpect(jsonPath("$.latency_ms").value(121.4));
    }

    @Test
    @DisplayName("GET /api/ai/sentiment/health expose la sante du microservice")
    void health_returnsGatewayHealth() throws Exception {
        when(sentimentAnalysisService.healthCheck()).thenReturn(AiServiceHealthDto.builder()
                .available(true)
                .status("healthy")
                .service("sentiment-service")
                .modelLoaded(true)
                .mode("hybrid")
                .build());

        mockMvc.perform(get("/api/ai/sentiment/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.status").value("healthy"))
                .andExpect(jsonPath("$.service").value("sentiment-service"))
                .andExpect(jsonPath("$.model_loaded").value(true))
                .andExpect(jsonPath("$.mode").value("hybrid"));
    }
}
