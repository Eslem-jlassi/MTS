package com.billcom.mts.service.impl;

import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.entity.Incident;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.repository.IncidentRepository;
import com.billcom.mts.repository.IncidentTimelineRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.service.AuditService;
import com.billcom.mts.service.SensitiveActionVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IncidentServiceImplTest {

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private TelecomServiceRepository telecomServiceRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IncidentTimelineRepository timelineRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private SensitiveActionVerificationService sensitiveActionVerificationService;

    @InjectMocks
    private IncidentServiceImpl service;

    private User admin;
    private Incident incident;

    @BeforeEach
    void setUp() {
        admin = User.builder()
                .id(1L)
                .email("admin@mts-telecom.ma")
                .role(UserRole.ADMIN)
                .build();

        TelecomService telecomService = TelecomService.builder().id(5L).name("Core MPLS").build();
        incident = Incident.builder()
                .id(7L)
                .incidentNumber("INC-00007")
                .title("Incident critique")
                .status(IncidentStatus.OPEN)
                .severity(Severity.CRITICAL)
                .service(telecomService)
                .startedAt(LocalDateTime.now().minusHours(1))
                .tickets(new HashSet<>())
                .affectedServices(new HashSet<>())
                .build();
    }

    @Test
    @DisplayName("hardDeleteIncidentAsAdmin should enforce reauth and delete incident safely")
    void hardDeleteIncidentAsAdmin_success() {
        when(incidentRepository.findById(7L)).thenReturn(Optional.of(incident));
        when(timelineRepository.countByIncidentId(7L)).thenReturn(1L);

        AdminHardDeleteRequest request = AdminHardDeleteRequest.builder()
                .confirmationKeyword("SUPPRIMER")
                .confirmationTargetId("INC-00007")
                .currentPassword("Password1!")
                .build();

        service.hardDeleteIncidentAsAdmin(7L, admin, "127.0.0.1", request);

        verify(sensitiveActionVerificationService).verifyHardDeleteAuthorization(
                eq(admin),
                eq("INC-00007"),
                eq(request),
                contains("INC-00007")
        );
        verify(incidentRepository).saveAndFlush(incident);
        verify(incidentRepository).delete(incident);
        verify(auditService).log(eq("Incident"), eq("7"), eq("DELETE"), eq(admin), contains("snapshot"), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("hardDeleteIncidentAsAdmin should detach business dependencies before delete")
    void hardDeleteIncidentAsAdmin_detachesDependencies() {
        incident.getTickets().add(Ticket.builder().id(11L).ticketNumber("TKT-00011").build());
        incident.setTicket(Ticket.builder().id(12L).ticketNumber("TKT-00012").build());
        when(incidentRepository.findById(7L)).thenReturn(Optional.of(incident));
        when(timelineRepository.countByIncidentId(7L)).thenReturn(1L);

        AdminHardDeleteRequest request = AdminHardDeleteRequest.builder()
                .confirmationKeyword("SUPPRIMER")
                .confirmationTargetId("INC-00007")
                .currentPassword("Password1!")
                .build();

        service.hardDeleteIncidentAsAdmin(7L, admin, "127.0.0.1", request);

        verify(incidentRepository).saveAndFlush(incident);
        verify(incidentRepository).delete(incident);
    }

    @Test
    @DisplayName("issueHardDeleteChallenge should issue verification code and audit")
    void issueHardDeleteChallenge_success() {
        when(incidentRepository.findById(7L)).thenReturn(Optional.of(incident));

        service.issueHardDeleteChallenge(7L, admin, "127.0.0.1");

        verify(sensitiveActionVerificationService).issueHardDeleteVerificationCode(
                eq(admin),
                contains("INC-00007")
        );
        verify(auditService).log(eq("Incident"), eq("7"), eq("UPDATE"), eq(admin), contains("Challenge"), eq("127.0.0.1"));
    }
}
