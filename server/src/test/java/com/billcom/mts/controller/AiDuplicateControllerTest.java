package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.dto.ai.DuplicateDetectionResponseDto;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.DuplicateDetectionService;
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

@WebMvcTest(AiDuplicateController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class AiDuplicateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DuplicateDetectionService duplicateDetectionService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/ai/duplicates/detect expose le contrat enrichi Sprint 3")
    void detect_returnsUnifiedContract() throws Exception {
        DuplicateDetectionResponseDto response = new DuplicateDetectionResponseDto();
        response.setAvailable(true);
        response.setDuplicate(true);
        response.setPossibleMassIncident(true);
        response.setDuplicateConfidence(0.91);
        response.setConfidence(0.91);
        response.setReasoning("Doublon probable detecte.");
        response.setRecommendation("Verifier puis fusionner avec le ticket parent.");
        response.setModelVersion("duplicate-detector-1.1.0");
        response.setFallbackMode("sentence-transformers");
        response.setReasoningSteps(List.of("Score max=0.910, seuil doublon=0.850."));
        response.setRecommendedActions(List.of("Lier le ticket avec le parent confirme."));
        response.setRiskFlags(List.of("DUPLICATE_RISK", "MASS_INCIDENT_RISK"));
        response.setMissingInformation(List.of("service impacte"));
        response.setSources(List.of("embedding-engine:sentence-transformers", "ticket:101"));
        response.setLatencyMs(78.2);

        DuplicateDetectionResponseDto.MatchedTicketDto match = new DuplicateDetectionResponseDto.MatchedTicketDto();
        match.setTicketId(101L);
        match.setTitle("Lenteur reseau site principal");
        match.setSimilarityScore(0.91);
        match.setDuplicateLevel("HIGH");
        response.setMatchedTickets(List.of(match));

        when(duplicateDetectionService.detectDuplicates(any())).thenReturn(response);

        mockMvc.perform(post("/api/ai/duplicates/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "new_ticket": {
                                    "title": "Reseau lent",
                                    "description": "Plusieurs clients impactes"
                                  },
                                  "recent_tickets": [
                                    {
                                      "id": 101,
                                      "title": "Lenteur reseau site principal"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.is_duplicate").value(true))
                .andExpect(jsonPath("$.possible_mass_incident").value(true))
                .andExpect(jsonPath("$.duplicate_confidence").value(0.91))
                .andExpect(jsonPath("$.confidence").value(0.91))
                .andExpect(jsonPath("$.model_version").value("duplicate-detector-1.1.0"))
                .andExpect(jsonPath("$.fallback_mode").value("sentence-transformers"))
                .andExpect(jsonPath("$.reasoning_steps[0]").value("Score max=0.910, seuil doublon=0.850."))
                .andExpect(jsonPath("$.recommended_actions[0]").value("Lier le ticket avec le parent confirme."))
                .andExpect(jsonPath("$.risk_flags[0]").value("DUPLICATE_RISK"))
                .andExpect(jsonPath("$.sources[0]").value("embedding-engine:sentence-transformers"))
                .andExpect(jsonPath("$.latency_ms").value(78.2))
                .andExpect(jsonPath("$.matched_tickets[0].ticket_id").value(101));
    }

    @Test
    @DisplayName("GET /api/ai/duplicates/health expose la sante du service doublons")
    void health_returnsGatewayHealth() throws Exception {
        when(duplicateDetectionService.healthCheck()).thenReturn(AiServiceHealthDto.builder()
                .available(true)
                .status("healthy")
                .service("duplicate-service")
                .modelLoaded(true)
                .mode("sentence-transformers")
                .build());

        mockMvc.perform(get("/api/ai/duplicates/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.status").value("healthy"))
                .andExpect(jsonPath("$.service").value("duplicate-service"))
                .andExpect(jsonPath("$.model_loaded").value(true))
                .andExpect(jsonPath("$.mode").value("sentence-transformers"));
    }
}
