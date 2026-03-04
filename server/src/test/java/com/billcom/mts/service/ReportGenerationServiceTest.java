package com.billcom.mts.service;

import com.billcom.mts.dto.report.GenerateReportRequest;
import com.billcom.mts.entity.Report;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ReportType;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.IncidentRepository;
import com.billcom.mts.repository.ReportRepository;
import com.billcom.mts.repository.TicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportGenerationServiceTest {

    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private ReportRepository reportRepository;

    @InjectMocks
    private ReportGenerationService reportGenerationService;

    @Test
    void generateReport_createsReportWithCorrectSource() {
        ReflectionTestUtils.setField(reportGenerationService, "uploadDir", "target/test-reports");
        when(ticketRepository.countCreatedBetween(any(), any())).thenReturn(10L);
        when(ticketRepository.countResolvedBetween(any(), any())).thenReturn(5L);
        when(incidentRepository.countByPeriod(any(), any())).thenReturn(2L);
        when(ticketRepository.findByCreatedAtBetween(any(), any())).thenReturn(Collections.emptyList());
        when(reportRepository.save(any())).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        User user = new User();
        user.setId(1L);
        user.setEmail("manager@test.com");
        user.setRole(UserRole.MANAGER);
        user.setFirstName("Test");
        user.setLastName("User");

        GenerateReportRequest request = GenerateReportRequest.builder()
                .reportType(ReportType.WEEKLY)
                .periodStart(LocalDate.of(2026, 1, 1))
                .periodEnd(LocalDate.of(2026, 1, 7))
                .publish(true)
                .build();

        var response = reportGenerationService.generateReport(request, user);

        assertThat(response).isNotNull();
        assertThat(response.getSource()).isEqualTo("GENERATED");
        assertThat(response.getReportType()).isEqualTo("WEEKLY");
        assertThat(response.getIsPublished()).isTrue();
    }
}
