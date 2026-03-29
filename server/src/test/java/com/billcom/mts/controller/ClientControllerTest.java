package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.AuditLogService;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.UserService;
import com.billcom.mts.dto.user.UserResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClientController.class)
@AutoConfigureMockMvc(addFilters = false)
@MockBean(JpaMetamodelMappingContext.class)
class ClientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClientRepository clientRepository;

    @MockBean
    private TicketRepository ticketRepository;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/clients cree un client via le flux back-office admin")
    @WithMockUser(username = "admin@mts-telecom.tn", roles = "ADMIN")
    void createClient_success() throws Exception {
        when(userService.getUserByEmail("admin@mts-telecom.tn")).thenReturn(UserResponse.builder()
                .id(99L)
                .email("admin@mts-telecom.tn")
                .firstName("Admin")
                .lastName("MTS")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build());
        User createdUser = User.builder()
                .id(31L)
                .email("client2@mts-telecom.tn")
                .firstName("Nadia")
                .lastName("Client")
                .phone("+21622222222")
                .role(UserRole.CLIENT)
                .isActive(true)
                .build();

        Client createdClient = Client.builder()
                .id(44L)
                .clientCode("CLI-2026-00044")
                .companyName("Telco Plus")
                .address("Tunis")
                .user(createdUser)
                .build();

        when(authService.registerByAdmin(any(), anyLong())).thenReturn(AuthResponse.builder()
                .user(AuthResponse.UserInfo.builder()
                        .id(31L)
                        .email("client2@mts-telecom.tn")
                        .firstName("Nadia")
                        .lastName("Client")
                        .role(UserRole.CLIENT)
                        .build())
                .build());
        when(clientRepository.findByUserId(31L)).thenReturn(Optional.of(createdClient));
        when(ticketRepository.countByClientId(44L)).thenReturn(0L);

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "client2@mts-telecom.tn",
                                  "password": "Password1",
                                  "confirmPassword": "Password1",
                                  "firstName": "Nadia",
                                  "lastName": "Client",
                                  "phone": "+21622222222",
                                  "companyName": "Telco Plus",
                                  "address": "Tunis"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(44))
                .andExpect(jsonPath("$.clientCode").value("CLI-2026-00044"))
                .andExpect(jsonPath("$.companyName").value("Telco Plus"))
                .andExpect(jsonPath("$.userEmail").value("client2@mts-telecom.tn"));

        verify(authService).registerByAdmin(any(), anyLong());
        verify(clientRepository).findByUserId(31L);
        verify(userService).getUserByEmail("admin@mts-telecom.tn");
    }

    @Test
    @DisplayName("POST /api/clients/{id}/archive archive un client sans le supprimer")
    @WithMockUser(roles = "ADMIN")
    void archiveClient_success() throws Exception {
        User clientUser = User.builder()
                .id(31L)
                .email("client2@mts-telecom.tn")
                .firstName("Nadia")
                .lastName("Client")
                .phone("+21622222222")
                .role(UserRole.CLIENT)
                .isActive(true)
                .build();

        Client client = Client.builder()
                .id(44L)
                .clientCode("CLI-2026-00044")
                .companyName("Telco Plus")
                .address("Tunis")
                .user(clientUser)
                .build();

        when(clientRepository.findByIdWithUser(44L)).thenReturn(Optional.of(client));
        when(ticketRepository.countByClientId(44L)).thenReturn(0L);

        mockMvc.perform(post("/api/clients/44/archive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(44))
                .andExpect(jsonPath("$.clientCode").value("CLI-2026-00044"));

        verify(userService).deactivateUser(31L);
    }

    @Test
    @DisplayName("DELETE /api/clients/{id}/hard-delete supprime definitivement un client sans tickets")
    @WithMockUser(roles = "ADMIN")
    void hardDeleteClient_success() throws Exception {
        User clientUser = User.builder()
                .id(31L)
                .email("client2@mts-telecom.tn")
                .firstName("Nadia")
                .lastName("Client")
                .role(UserRole.CLIENT)
                .isActive(false)
                .build();

        Client client = Client.builder()
                .id(44L)
                .clientCode("CLI-2026-00044")
                .companyName("Telco Plus")
                .address("Tunis")
                .user(clientUser)
                .build();

        when(clientRepository.findByIdWithUser(44L)).thenReturn(Optional.of(client));
        when(ticketRepository.countByClientId(44L)).thenReturn(0L);

        mockMvc.perform(delete("/api/clients/44/hard-delete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Client supprime definitivement"));

        verify(userService).hardDeleteClientAccountByAdmin(31L);
    }
}
