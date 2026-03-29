// =============================================================================
// MTS TELECOM - ClientController (REST API)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.RegisterRequest;
import com.billcom.mts.dto.client.ClientResponse;
import com.billcom.mts.dto.client.CreateClientAccountRequest;
import com.billcom.mts.dto.client.UpdateClientRequest;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.AuditAction;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.service.AuditLogService;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.UserService;
import com.billcom.mts.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * ClientController - Gestion des clients (CRUD + recherche).
 *
 * Endpoints:
 * - GET  /api/clients          - Liste paginee (ADMIN/MANAGER)
 * - POST /api/clients          - Creation back-office client + compte (ADMIN)
 * - GET  /api/clients/{id}     - Detail client (ADMIN/MANAGER)
 * - GET  /api/clients/code/{c} - Par code client (ADMIN/MANAGER)
 * - GET  /api/clients/search   - Recherche (ADMIN/MANAGER)
 * - PUT  /api/clients/{id}     - Mise a jour (ADMIN)
 */
@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
@Slf4j
public class ClientController {

    private final ClientRepository clientRepository;
    private final TicketRepository ticketRepository;
    private final AuditLogService auditLogService;
    private final AuthService authService;
    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<ClientResponse>> getClients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "companyName") String sort,
            @RequestParam(defaultValue = "ASC") String direction,
            @RequestParam(required = false) String search) {

        Sort.Direction dir = "DESC".equalsIgnoreCase(direction)
                ? Sort.Direction.DESC : Sort.Direction.ASC;

        String sortField = mapSortField(sort);
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(dir, sortField));

        Page<Client> clients;
        if (search != null && !search.isBlank()) {
            clients = clientRepository.searchClients(search.trim(), pageable);
        } else {
            clients = clientRepository.findAllWithUser(pageable);
        }

        Page<ClientResponse> response = clients.map(this::toResponse);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ClientResponse createClient(
            @Valid @RequestBody CreateClientAccountRequest request,
            @AuthenticationPrincipal User admin,
            Authentication authentication) {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(request.getEmail())
                .password(request.getPassword())
                .confirmPassword(request.getConfirmPassword())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .companyName(request.getCompanyName())
                .address(request.getAddress())
                .role(UserRole.CLIENT)
                .build();

        Long createdUserId = authService.registerByAdmin(
                registerRequest,
                resolveAuthenticatedUserId(admin, authentication)
        ).getUser().getId();
        Client client = clientRepository.findByUserId(createdUserId)
                .orElseThrow(() -> new RuntimeException("Client cree mais profil introuvable"));
        return toResponse(client);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ClientResponse> getClientById(@PathVariable Long id) {
        Client client = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));
        return ResponseEntity.ok(toResponse(client));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ClientResponse> getClientByCode(@PathVariable String code) {
        Client client = clientRepository.findByClientCodeWithUser(code)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + code));
        return ResponseEntity.ok(toResponse(client));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<ClientResponse>> searchClients(@RequestParam("q") String query) {
        Page<Client> results = clientRepository.searchClients(
                query.trim(), PageRequest.of(0, 20, Sort.by("companyName")));
        List<ClientResponse> response = results.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClientResponse> updateClient(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {

        Client client = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));

        String oldValue = String.format("companyName=%s, address=%s",
                client.getCompanyName(), client.getAddress());

        if (request.getCompanyName() != null) {
            client.setCompanyName(request.getCompanyName());
        }
        if (request.getAddress() != null) {
            client.setAddress(request.getAddress());
        }

        Client saved = clientRepository.save(client);

        String newValue = String.format("companyName=%s, address=%s",
                saved.getCompanyName(), saved.getAddress());

        auditLogService.log(
                AuditAction.CLIENT_UPDATED,
                "Client",
                saved.getId(),
                saved.getDisplayName(),
                "Modification du client " + saved.getClientCode(),
                oldValue,
                newValue,
                user,
                httpRequest
        );

        log.info("Client {} updated by {}", saved.getClientCode(), user.getEmail());
        return ResponseEntity.ok(toResponse(saved));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClientResponse> archiveClient(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {

        Client client = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));

        userService.deactivateUser(client.getUser().getId());

        auditLogService.log(
                AuditAction.CLIENT_UPDATED,
                "Client",
                client.getId(),
                client.getDisplayName(),
                "Archivage du client " + client.getClientCode(),
                "isActive=true",
                "isActive=false",
                admin,
                httpRequest
        );

        Client refreshed = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));
        return ResponseEntity.ok(toResponse(refreshed));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClientResponse> restoreClient(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {

        Client client = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));

        userService.activateUser(client.getUser().getId());

        auditLogService.log(
                AuditAction.CLIENT_UPDATED,
                "Client",
                client.getId(),
                client.getDisplayName(),
                "Reactivation du client " + client.getClientCode(),
                "isActive=false",
                "isActive=true",
                admin,
                httpRequest
        );

        Client refreshed = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));
        return ResponseEntity.ok(toResponse(refreshed));
    }

    @DeleteMapping("/{id}/hard-delete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<java.util.Map<String, String>> hardDeleteClient(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest httpRequest) {

        Client client = clientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new RuntimeException("Client introuvable: " + id));

        long ticketCount = ticketRepository.countByClientId(client.getId());
        String oldValue = String.format(
                "clientCode=%s, companyName=%s, email=%s, ticketCount=%d",
                client.getClientCode(),
                client.getCompanyName(),
                client.getUser().getEmail(),
                ticketCount
        );

        userService.hardDeleteClientAccountByAdmin(client.getUser().getId());

        auditLogService.log(
                AuditAction.CLIENT_DELETED,
                "Client",
                client.getId(),
                client.getDisplayName(),
                "Suppression definitive du client " + client.getClientCode(),
                oldValue,
                null,
                admin,
                httpRequest
        );

        return ResponseEntity.ok(java.util.Map.of("message", "Client supprime definitivement"));
    }

    private ClientResponse toResponse(Client client) {
        long ticketCount = ticketRepository.countByClientId(client.getId());
        return ClientResponse.from(client, ticketCount);
    }

    private String mapSortField(String field) {
        return switch (field) {
            case "userEmail" -> "user.email";
            case "clientCode" -> "clientCode";
            case "createdAt" -> "createdAt";
            default -> "companyName";
        };
    }

    private Long resolveAuthenticatedUserId(User authenticatedUser, Authentication authentication) {
        if (authenticatedUser != null && authenticatedUser.getId() != null) {
            return authenticatedUser.getId();
        }

        Authentication resolvedAuthentication = authentication != null
                ? authentication
                : SecurityContextHolder.getContext().getAuthentication();

        if (resolvedAuthentication != null && resolvedAuthentication.getName() != null) {
            return userService.getUserByEmail(resolvedAuthentication.getName()).getId();
        }

        throw new UnauthorizedException("Utilisateur authentifie introuvable");
    }
}
