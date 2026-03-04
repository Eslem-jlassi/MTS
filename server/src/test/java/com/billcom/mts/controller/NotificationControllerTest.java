package com.billcom.mts.controller;

import com.billcom.mts.dto.notification.NotificationResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests du NotificationController via MockMvc.
 */
@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationService notificationService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    private NotificationResponse sampleNotification() {
        return NotificationResponse.builder()
                .id(1L)
                .title("Nouveau ticket")
                .message("Ticket TKT-2026-00001 créé")
                .type("TICKET_CREATED")
                .typeLabel("Nouveau ticket")
                .referenceType("TICKET")
                .referenceId(100L)
                .referencePath("/tickets/100")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .isUrgent(false)
                .build();
    }

    // =========================================================================
    // GET /api/notifications
    // =========================================================================
    @Test
    @DisplayName("GET /api/notifications — devrait retourner une page de notifications")
    @WithMockUser
    void getNotifications_paged() throws Exception {
        Page<NotificationResponse> page = new PageImpl<>(
                List.of(sampleNotification()),
                PageRequest.of(0, 20),
                1
        );
        when(notificationService.getUserNotifications(any(User.class), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/notifications").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].title").value("Nouveau ticket"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    // =========================================================================
    // GET /api/notifications/unread
    // =========================================================================
    @Test
    @DisplayName("GET /api/notifications/unread — devrait retourner les non lues")
    @WithMockUser
    void getUnread_success() throws Exception {
        when(notificationService.getUnreadNotifications(any(User.class)))
                .thenReturn(List.of(sampleNotification()));

        mockMvc.perform(get("/api/notifications/unread"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].isRead").value(false));
    }

    // =========================================================================
    // GET /api/notifications/count
    // =========================================================================
    @Test
    @DisplayName("GET /api/notifications/count — devrait retourner le compteur")
    @WithMockUser
    void getUnreadCount_success() throws Exception {
        when(notificationService.getUnreadCount(any(User.class))).thenReturn(5L);

        mockMvc.perform(get("/api/notifications/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(5));
    }

    // =========================================================================
    // PUT /api/notifications/{id}/read
    // =========================================================================
    @Test
    @DisplayName("PUT /api/notifications/1/read — devrait retourner 200")
    @WithMockUser
    void markAsRead_success() throws Exception {
        doNothing().when(notificationService).markAsRead(eq(1L), any(User.class));

        mockMvc.perform(put("/api/notifications/1/read"))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // PUT /api/notifications/read-all
    // =========================================================================
    @Test
    @DisplayName("PUT /api/notifications/read-all — devrait retourner le compteur de marquées")
    @WithMockUser
    void markAllAsRead_success() throws Exception {
        when(notificationService.markAllAsRead(any(User.class))).thenReturn(3);

        mockMvc.perform(put("/api/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.markedCount").value(3));
    }
}
