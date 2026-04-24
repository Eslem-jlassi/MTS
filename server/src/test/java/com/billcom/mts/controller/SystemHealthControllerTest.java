package com.billcom.mts.controller;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.ChatbotService;
import com.billcom.mts.service.DuplicateDetectionService;
import com.billcom.mts.service.SentimentAnalysisService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SystemHealthController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class SystemHealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private SentimentAnalysisService sentimentAnalysisService;

    @MockBean
    private DuplicateDetectionService duplicateDetectionService;

    @MockBean
    private ChatbotService chatbotService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("GET /api/system/health retourne un resume UP lisible")
    void health_returnsReadableUpSummary() throws Exception {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
        when(sentimentAnalysisService.healthCheck()).thenReturn(available("sentiment-service"));
        when(duplicateDetectionService.healthCheck()).thenReturn(available("duplicate-service"));
        when(chatbotService.healthCheck()).thenReturn(available("ai-chatbot"));

        mockMvc.perform(get("/api/system/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.services.database.status").value("UP"))
                .andExpect(jsonPath("$.services.sentiment.available").value(true))
                .andExpect(jsonPath("$.services.chatbot.available").value(true))
                .andExpect(jsonPath("$.services.allie.available").value(true));
    }

    @Test
    @DisplayName("GET /api/system/health retourne un resume DEGRADED si un microservice IA tombe")
    void health_returnsDegradedWhenAiUnavailable() throws Exception {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
        when(sentimentAnalysisService.healthCheck()).thenReturn(available("sentiment-service"));
        when(duplicateDetectionService.healthCheck()).thenReturn(unavailable("duplicate-service"));
        when(chatbotService.healthCheck()).thenReturn(available("ai-chatbot"));

        mockMvc.perform(get("/api/system/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DEGRADED"))
                .andExpect(jsonPath("$.services.duplicate.available").value(false))
                .andExpect(jsonPath("$.services.allie.available").value(true));
    }

    private AiServiceHealthDto available(String serviceName) {
        return AiServiceHealthDto.builder()
                .available(true)
                .status("healthy")
                .service(serviceName)
                .version("1.0.0")
                .message("ok")
                .build();
    }

    private AiServiceHealthDto unavailable(String serviceName) {
        return AiServiceHealthDto.unavailable(serviceName, "down");
    }
}
