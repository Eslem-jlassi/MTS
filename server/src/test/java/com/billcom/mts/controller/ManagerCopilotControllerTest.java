package com.billcom.mts.controller;

import com.billcom.mts.dto.managercopilot.ManagerCopilotDashboardResponse;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.ManagerCopilotService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ManagerCopilotController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class ManagerCopilotControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ManagerCopilotService managerCopilotService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("GET /api/manager-ai/copilot/dashboard expose le snapshot supervise attendu")
    @WithMockUser(roles = "MANAGER")
    void getDashboard_returnsSupervisedSnapshot() throws Exception {
        ManagerCopilotDashboardResponse response = ManagerCopilotDashboardResponse.builder()
                .available(true)
                .mode("live")
                .generatedAt("2026-04-21T10:00:00")
                .summary("1 faisceau incident ressort de la supervision.")
                .modelVersion("manager-copilot-knn-1.0.0")
                .inferenceMode("knn")
                .confidenceScore(0.81)
                .featureSummary(List.of("Service degrade ou indisponible", "4 ticket(s) similaires"))
                .reasoningSteps(List.of("KNN supervise execute sur 2 cas manager."))
                .recommendedActions(List.of("Controler les incidents"))
                .urgentCount(1)
                .priorityTickets(List.of())
                .probableIncidents(List.of(
                        ManagerCopilotDashboardResponse.SignalDto.builder()
                                .id("incident-signal-1")
                                .eyebrow("Incident probable")
                                .title("BSCS montre un faisceau de tickets")
                                .description("L'action Ouvrir un incident ressort sur 2/3 voisin(s) proches.")
                                .href("/health?serviceId=7")
                                .tone("warning")
                                .confidence("high")
                                .signalKind("incident")
                                .serviceId(7L)
                                .serviceName("BSCS Billing")
                                .predictedAction("OPEN_INCIDENT")
                                .confidenceScore(0.81)
                                .featureSummary(List.of("4 ticket(s) similaires"))
                                .nearestExamples(List.of(
                                        ManagerCopilotDashboardResponse.NearestExampleDto.builder()
                                                .exampleId("seed-inc-001")
                                                .label("OPEN_INCIDENT")
                                                .title("Cluster tickets BSCS facture")
                                                .summary("Plusieurs tickets similaires convergent sur BSCS.")
                                                .recommendation("Ouvrir un incident global.")
                                                .distance(0.18)
                                                .featureSummary(List.of("Service degrade ou indisponible"))
                                                .build()
                                ))
                                .build()
                ))
                .assignments(List.of())
                .slaAlerts(List.of())
                .quickActions(List.of(
                        ManagerCopilotDashboardResponse.QuickActionDto.builder()
                                .id("review-incidents")
                                .label("Controler les incidents")
                                .description("Valide s'il faut ouvrir ou relier un incident cote supervision.")
                                .href("/incidents")
                                .tone("warning")
                                .build()
                ))
                .build();

        when(managerCopilotService.getDashboardSummary("WEEK", 7L, null)).thenReturn(response);

        mockMvc.perform(get("/api/manager-ai/copilot/dashboard")
                        .param("period", "WEEK")
                        .param("serviceId", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("live"))
                .andExpect(jsonPath("$.modelVersion").value("manager-copilot-knn-1.0.0"))
                .andExpect(jsonPath("$.inferenceMode").value("knn"))
                .andExpect(jsonPath("$.confidenceScore").value(0.81))
                .andExpect(jsonPath("$.probableIncidents[0].predictedAction").value("OPEN_INCIDENT"))
                .andExpect(jsonPath("$.probableIncidents[0].nearestExamples[0].exampleId").value("seed-inc-001"))
                .andExpect(jsonPath("$.quickActions[0].label").value("Controler les incidents"));
    }
}
