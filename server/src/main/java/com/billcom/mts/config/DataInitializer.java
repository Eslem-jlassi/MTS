package com.billcom.mts.config;

import com.billcom.mts.entity.*;
import com.billcom.mts.enums.*;
import com.billcom.mts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Data initializer for H2 in-memory database.
 * Creates test data on startup.
 */
@Slf4j
@Component
@Profile("h2")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final TelecomServiceRepository serviceRepository;
    private final TicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;
    
    private final AtomicInteger ticketCounter = new AtomicInteger(0);

    @Override
    @Transactional
    public void run(String... args) {
        log.info("=== Initializing test data for H2 database ===");
        
        // Create users
        User admin = createUser("admin@mts.com", "Admin", "System", UserRole.ADMIN);
        createUser("manager@mts.com", "Manager", "Telecom", UserRole.MANAGER);
        User agent1 = createUser("agent1@mts.com", "Agent", "Support", UserRole.AGENT);
        User agent2 = createUser("agent2@mts.com", "Agent", "Technique", UserRole.AGENT);
        User clientUser1 = createUser("client@mts.com", "Client", "Test", UserRole.CLIENT);
        User clientUser2 = createUser("demo@mts.com", "Demo", "User", UserRole.CLIENT);
        
        // Create client profiles
        Client client1 = createClient(clientUser1, "CLI-2026-001", "Ericsson Tunisia", "Tunis, Tunisia");
        Client client2 = createClient(clientUser2, "CLI-2026-002", "Billcom Consulting", "Ariana, Tunisia");
        
        // Create telecom services
        TelecomService billing = createService("Billing System", ServiceCategory.BILLING, admin);
        TelecomService crm = createService("CRM Platform", ServiceCategory.CRM, admin);
        TelecomService network = createService("Network Operations", ServiceCategory.NETWORK, admin);
        TelecomService infra = createService("IT Infrastructure", ServiceCategory.INFRA, admin);
        
        // Create sample tickets
        createTicket("Problème de facturation", "La facture du mois de janvier contient des erreurs", 
            TicketCategory.PANNE, TicketPriority.HIGH, client1, billing, clientUser1, agent1);
        
        createTicket("Demande d'évolution CRM", "Ajouter un nouveau rapport mensuel", 
            TicketCategory.EVOLUTION, TicketPriority.MEDIUM, client1, crm, clientUser1, null);
        
        createTicket("Panne réseau site Tunis", "Connexion intermittente depuis ce matin", 
            TicketCategory.PANNE, TicketPriority.CRITICAL, client2, network, clientUser2, agent2);
        
        createTicket("Installation nouvelle ligne", "Demande installation ligne VoIP", 
            TicketCategory.DEMANDE, TicketPriority.LOW, client2, infra, clientUser2, agent1);
        
        createTicket("Erreur synchronisation données", "Les données clients ne se synchronisent plus", 
            TicketCategory.PANNE, TicketPriority.HIGH, client1, crm, clientUser1, agent2);
        
        log.info("=== Test data initialization complete ===");
        log.info("Test accounts created:");
        log.info("  - admin@mts.com / password (ADMIN)");
        log.info("  - manager@mts.com / password (MANAGER)");
        log.info("  - agent1@mts.com / password (AGENT)");
        log.info("  - agent2@mts.com / password (AGENT)");
        log.info("  - client@mts.com / password (CLIENT)");
        log.info("  - demo@mts.com / password (CLIENT)");
    }

    private User createUser(String email, String firstName, String lastName, UserRole role) {
        User user = User.builder()
            .email(email)
            .password(passwordEncoder.encode("password"))
            .firstName(firstName)
            .lastName(lastName)
            .role(role)
            .isActive(true)
            .build();
        return userRepository.save(user);
    }

    private Client createClient(User user, String code, String company, String address) {
        Client client = Client.builder()
            .user(user)
            .clientCode(code)
            .companyName(company)
            .address(address)
            .build();
        return clientRepository.save(client);
    }

    private TelecomService createService(String name, ServiceCategory category, User creator) {
        TelecomService service = TelecomService.builder()
            .name(name)
            .description("Service " + name)
            .category(category)
            .isActive(true)
            .createdBy(creator)
            .build();
        return serviceRepository.save(service);
    }

    private void createTicket(String title, String description, TicketCategory category,
                              TicketPriority priority, Client client, TelecomService service,
                              User createdBy, User assignedTo) {
        int slaHours = priority.getSlaHours();
        
        TicketStatus status = assignedTo != null ? TicketStatus.IN_PROGRESS : TicketStatus.NEW;
        String ticketNumber = generateTicketNumber();
        
        Ticket ticket = Ticket.builder()
            .ticketNumber(ticketNumber)
            .title(title)
            .description(description)
            .category(category)
            .priority(priority)
            .status(status)
            .client(client)
            .service(service)
            .createdBy(createdBy)
            .assignedTo(assignedTo)
            .slaHours(slaHours)
            .deadline(LocalDateTime.now().plusHours(slaHours))
            .breachedSla(false)
            .build();
        
        ticketRepository.save(ticket);
    }
    
    private String generateTicketNumber() {
        int year = Year.now().getValue();
        int number = ticketCounter.incrementAndGet();
        return String.format("TKT-%d-%05d", year, number);
    }
}
