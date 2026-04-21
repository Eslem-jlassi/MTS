package com.billcom.mts.service.impl;

import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.repository.AuditLogRepository;
import com.billcom.mts.repository.EscalationRuleRepository;
import com.billcom.mts.repository.IncidentRepository;
import com.billcom.mts.repository.IncidentTimelineRepository;
import com.billcom.mts.repository.NotificationRepository;
import com.billcom.mts.repository.QuickReplyTemplateRepository;
import com.billcom.mts.repository.RefreshTokenRepository;
import com.billcom.mts.repository.ReportRepository;
import com.billcom.mts.repository.ServiceStatusHistoryRepository;
import com.billcom.mts.repository.SlaTimelineRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import com.billcom.mts.repository.TicketAttachmentRepository;
import com.billcom.mts.repository.TicketCommentRepository;
import com.billcom.mts.repository.TicketHistoryRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private TicketRepository ticketRepository;
    @Mock private TicketAttachmentRepository ticketAttachmentRepository;
    @Mock private TicketCommentRepository ticketCommentRepository;
    @Mock private TicketHistoryRepository ticketHistoryRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private IncidentRepository incidentRepository;
    @Mock private IncidentTimelineRepository incidentTimelineRepository;
    @Mock private TelecomServiceRepository telecomServiceRepository;
    @Mock private QuickReplyTemplateRepository quickReplyTemplateRepository;
    @Mock private ServiceStatusHistoryRepository serviceStatusHistoryRepository;
    @Mock private EscalationRuleRepository escalationRuleRepository;
    @Mock private SlaTimelineRepository slaTimelineRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    private User activeAdmin;

    @BeforeEach
    void setUp() {
        activeAdmin = User.builder()
                .id(1L)
                .email("admin@mts-telecom.ma")
                .firstName("Admin")
                .lastName("Root")
                .role(UserRole.ADMIN)
                .isActive(true)
                .emailVerified(true)
                .password("encoded")
                .build();
    }

    @Test
    @DisplayName("updateUserRole refuse de retrograder le dernier administrateur actif")
    void updateUserRole_blocksLastActiveAdminDemotion() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeAdmin));
        when(userRepository.countByRoleAndIsActiveTrue(UserRole.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> userService.updateUserRole(1L, UserRole.MANAGER))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("dernier administrateur actif");

        verify(userRepository, never()).save(activeAdmin);
    }

    @Test
    @DisplayName("deactivateUser refuse de desactiver le dernier administrateur actif")
    void deactivateUser_blocksLastActiveAdmin() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeAdmin));
        when(userRepository.countByRoleAndIsActiveTrue(UserRole.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> userService.deactivateUser(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("dernier administrateur actif");

        verify(userRepository, never()).save(activeAdmin);
    }

    @Test
    @DisplayName("hardDeleteUserByAdmin refuse de supprimer le dernier administrateur actif")
    void hardDeleteUserByAdmin_blocksLastActiveAdmin() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeAdmin));
        when(userRepository.countByRoleAndIsActiveTrue(UserRole.ADMIN)).thenReturn(1L);
        User deletingAdmin = User.builder()
                .id(2L)
                .email("admin2@mts-telecom.ma")
                .role(UserRole.ADMIN)
                .isActive(true)
                .password("encoded")
                .build();

        assertThatThrownBy(() -> userService.hardDeleteUserByAdmin(1L, deletingAdmin))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("dernier administrateur actif");

        verify(userRepository, never()).delete(activeAdmin);
    }
}
