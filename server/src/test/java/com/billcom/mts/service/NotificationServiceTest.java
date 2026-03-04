package com.billcom.mts.service;

import com.billcom.mts.dto.notification.NotificationResponse;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.Notification;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.NotificationType;
import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.NotificationRepository;
import com.billcom.mts.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour NotificationService.
 *
 * Vérifie:
 * - notifyTicketCreated: persistance + broadcast + envoi perso à chaque staff
 * - notifyTicketAssigned: envoi à l'agent assigné
 * - getUserNotifications / getUnreadNotifications / getUnreadCount
 * - markAsRead / markAllAsRead
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private NotificationService notificationService;

    @Captor
    private ArgumentCaptor<Notification> notificationCaptor;

    private User agentUser;
    private User managerUser;
    private User clientUser;
    private Client testClient;
    private Ticket testTicket;

    @BeforeEach
    void setUp() {
        agentUser = User.builder()
                .id(3L).email("agent@billcom.tn")
                .firstName("Agent").lastName("Support")
                .role(UserRole.AGENT).isActive(true).build();

        managerUser = User.builder()
                .id(2L).email("manager@billcom.tn")
                .firstName("Manager").lastName("Sup")
                .role(UserRole.MANAGER).isActive(true).build();

        clientUser = User.builder()
                .id(5L).email("client@billcom.tn")
                .firstName("Client").lastName("Test")
                .role(UserRole.CLIENT).isActive(true).build();

        testClient = Client.builder()
                .id(10L).user(clientUser)
                .clientCode("CLI-2026-00001")
                .companyName("Test Corp").build();

        testTicket = Ticket.builder()
                .id(100L)
                .ticketNumber("TKT-2026-00001")
                .title("Panne BSCS")
                .description("Facturation bloquée")
                .client(testClient)
                .createdBy(clientUser)
                .category(TicketCategory.PANNE)
                .priority(TicketPriority.HIGH)
                .status(TicketStatus.NEW)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // =========================================================================
    // notifyTicketCreated
    // =========================================================================
    @Nested
    @DisplayName("notifyTicketCreated()")
    class NotifyTicketCreatedTests {

        @Test
        @DisplayName("Devrait persister une notification par membre du staff et broadcaster")
        void notifyTicketCreated_createsAndBroadcasts() {
            when(userRepository.findByRoleIn(anyList()))
                    .thenReturn(List.of(agentUser, managerUser));
            when(notificationRepository.save(any(Notification.class)))
                    .thenAnswer(inv -> {
                        Notification n = inv.getArgument(0);
                        n.setId(1L);
                        return n;
                    });

            notificationService.notifyTicketCreated(testTicket);

            // 1 notification par staff (2 staff = 2 saves)
            verify(notificationRepository, times(2)).save(notificationCaptor.capture());
            List<Notification> saved = notificationCaptor.getAllValues();
            assertThat(saved).hasSize(2);
            assertThat(saved.get(0).getType()).isEqualTo(NotificationType.TICKET_CREATED);
            assertThat(saved.get(0).getReferenceType()).isEqualTo("TICKET");
            assertThat(saved.get(0).getReferenceId()).isEqualTo(100L);

            // WebSocket: envoi privé à chaque staff + broadcast /topic/tickets
            verify(messagingTemplate, times(2)).convertAndSendToUser(
                    anyString(), eq("/queue/notifications"), any(NotificationResponse.class));
            verify(messagingTemplate).convertAndSend(eq("/topic/tickets"), any(NotificationResponse.class));
        }
    }

    // =========================================================================
    // notifyTicketAssigned
    // =========================================================================
    @Nested
    @DisplayName("notifyTicketAssigned()")
    class NotifyTicketAssignedTests {

        @Test
        @DisplayName("Devrait envoyer une notification privée à l'agent assigné")
        void notifyAssigned_sendsToAgent() {
            when(notificationRepository.save(any(Notification.class)))
                    .thenAnswer(inv -> {
                        Notification n = inv.getArgument(0);
                        n.setId(2L);
                        return n;
                    });

            notificationService.notifyTicketAssigned(testTicket, agentUser);

            verify(notificationRepository, atLeastOnce()).save(notificationCaptor.capture());
            Notification saved = notificationCaptor.getValue();
            assertThat(saved.getUser().getId()).isEqualTo(3L);
            assertThat(saved.getType()).isEqualTo(NotificationType.TICKET_ASSIGNED);

            verify(messagingTemplate, atLeastOnce()).convertAndSendToUser(
                    eq("agent@billcom.tn"), eq("/queue/notifications"), any(NotificationResponse.class));
        }
    }

    // =========================================================================
    // getUserNotifications
    // =========================================================================
    @Nested
    @DisplayName("getUserNotifications() / getUnread() / getUnreadCount()")
    class GetNotificationsTests {

        @Test
        @DisplayName("getUserNotifications devrait retourner une page paginée")
        void getUserNotifications_paged() {
            Notification n1 = Notification.builder()
                    .id(1L).user(agentUser).title("Test")
                    .message("msg").type(NotificationType.TICKET_CREATED)
                    .isRead(false).createdAt(LocalDateTime.now()).build();
            Page<Notification> page = new PageImpl<>(List.of(n1));
            when(notificationRepository.findByUserOrderByCreatedAtDesc(eq(agentUser), any()))
                    .thenReturn(page);

            Page<NotificationResponse> result =
                    notificationService.getUserNotifications(agentUser, PageRequest.of(0, 20));

            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent().get(0).getTitle()).isEqualTo("Test");
        }

        @Test
        @DisplayName("getUnreadNotifications devrait retourner uniquement les non lues")
        void getUnread() {
            Notification n = Notification.builder()
                    .id(2L).user(agentUser).title("Unread")
                    .message("m").type(NotificationType.SLA_WARNING)
                    .isRead(false).createdAt(LocalDateTime.now()).build();
            when(notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(agentUser))
                    .thenReturn(List.of(n));

            List<NotificationResponse> list = notificationService.getUnreadNotifications(agentUser);
            assertThat(list).hasSize(1);
            assertThat(list.get(0).getIsRead()).isFalse();
        }

        @Test
        @DisplayName("getUnreadCount devrait retourner le compteur")
        void unreadCount() {
            when(notificationRepository.countByUserAndIsReadFalse(agentUser)).thenReturn(5L);
            assertThat(notificationService.getUnreadCount(agentUser)).isEqualTo(5L);
        }
    }

    // =========================================================================
    // markAsRead / markAllAsRead
    // =========================================================================
    @Nested
    @DisplayName("markAsRead() / markAllAsRead()")
    class MarkAsReadTests {

        @Test
        @DisplayName("markAsRead devrait trouver la notification et la marquer lue")
        void markAsRead_success() {
            Notification n = Notification.builder()
                    .id(10L).user(agentUser).title("T")
                    .message("m").type(NotificationType.TICKET_COMMENT)
                    .isRead(false).createdAt(LocalDateTime.now()).build();
            when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));

            notificationService.markAsRead(10L, agentUser);

            assertThat(n.getIsRead()).isTrue();
            assertThat(n.getReadAt()).isNotNull();
        }

        @Test
        @DisplayName("markAsRead devrait ignorer si la notification appartient à un autre user")
        void markAsRead_wrongUser() {
            Notification n = Notification.builder()
                    .id(10L).user(managerUser).title("T")
                    .message("m").type(NotificationType.TICKET_COMMENT)
                    .isRead(false).createdAt(LocalDateTime.now()).build();
            when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));

            notificationService.markAsRead(10L, agentUser);

            // Not marked — different user
            assertThat(n.getIsRead()).isFalse();
        }

        @Test
        @DisplayName("markAllAsRead devrait utiliser le repository bulk update")
        void markAllAsRead_success() {
            when(notificationRepository.markAllAsReadByUserId(eq(agentUser.getId()), any(LocalDateTime.class)))
                    .thenReturn(3);

            int count = notificationService.markAllAsRead(agentUser);
            assertThat(count).isEqualTo(3);
        }
    }
}
