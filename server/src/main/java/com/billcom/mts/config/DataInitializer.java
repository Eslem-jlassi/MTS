package com.billcom.mts.config;

import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.repository.UserRepository;
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
 * Data initializer for the H2 profile.
 * Creates a small but credible telecom support dataset for local demos.
 */
@Slf4j
@Component
@Profile("h2")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Password1!";

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final TelecomServiceRepository serviceRepository;
    private final TicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;

    private final AtomicInteger ticketCounter = new AtomicInteger(0);

    @Override
    @Transactional
    public void run(String... args) {
        log.info("=== Initializing H2 telecom demo data ===");

        User admin = createUser("admin@mts-telecom.ma", "Mohammed", "Benali", UserRole.ADMIN);
        createUser("manager@mts-telecom.ma", "Sara", "El Fassi", UserRole.MANAGER);
        User agent1 = createUser("karim.agent@mts-telecom.ma", "Karim", "Ziani", UserRole.AGENT);
        User agent2 = createUser("layla.agent@mts-telecom.ma", "Layla", "Amrani", UserRole.AGENT);
        User clientUser1 =
                createUser("support@atlas-distribution.ma", "Samir", "Alaoui", UserRole.CLIENT);
        User clientUser2 =
                createUser("dsi@sahara-connect.ma", "Nadia", "Belkacem", UserRole.CLIENT);

        Client client1 = createClient(
                clientUser1,
                "CLI-2026-00001",
                "Atlas Distribution Maroc",
                "Boulevard Ghandi, Casablanca");
        Client client2 = createClient(
                clientUser2,
                "CLI-2026-00002",
                "Sahara Connect Services",
                "Hay Riad, Rabat");

        TelecomService billing = createService(
                "BSCS Billing System",
                "Plateforme de facturation telecom pour le rating, la mediation et la valorisation des usages.",
                ServiceCategory.BILLING,
                admin);
        TelecomService crm = createService(
                "CRM Ericsson",
                "Plateforme CRM pour la gestion de la relation client, des comptes et des parcours support.",
                ServiceCategory.CRM,
                admin);
        TelecomService network = createService(
                "Core Network OSS",
                "Supervision coeur de reseau et collecte des KPI d exploitation telecom.",
                ServiceCategory.NETWORK,
                admin);
        TelecomService voip = createService(
                "VoIP Platform",
                "Telephonie IP multi-sites et trunks SIP pour les centres de contacts et sites entreprise.",
                ServiceCategory.NETWORK,
                admin);
        TelecomService fibre = createService(
                "Fibre FTTH",
                "Acces fibre optique FTTH / FTTO pour les sites entreprise et les liaisons critiques.",
                ServiceCategory.INFRA,
                admin);
        createService(
                "Cloud VPS",
                "Hebergement cloud prive pour workloads telecom et applications support.",
                ServiceCategory.INFRA,
                admin);
        createService("Data Migration Engine", ServiceCategory.INFRA, admin);
        createService("Mobile Portability Gateway", ServiceCategory.NETWORK, admin);
        createService("Order Care API", ServiceCategory.CRM, admin);
        createService("Provisioning Platform", ServiceCategory.NETWORK, admin);

        createTicket(
                "Blocage du rating BSCS sur les CDR roaming entrants",
                "Depuis 06:20 les CDR roaming entrants ne sont plus valorises dans BSCS. Le backlog "
                        + "depasse 42000 enregistrements et les soldes postpayes ne sont plus mis a jour.",
                TicketCategory.PANNE,
                TicketPriority.CRITICAL,
                client1,
                billing,
                clientUser1,
                agent1);

        createTicket(
                "Desynchronisation des fiches clients CRM vers BSCS",
                "Les creations de comptes corporate dans le CRM Ericsson ne remontent plus vers BSCS "
                        + "depuis la derniere mise a jour. Les dossiers commerciaux restent bloques.",
                TicketCategory.PANNE,
                TicketPriority.HIGH,
                client1,
                crm,
                clientUser1,
                agent2);

        createTicket(
                "Coupure intermittente sur l'acces Fibre FTTH du site Rabat",
                "Le site de Rabat perd la connectivite IP plusieurs fois par heure depuis ce matin. "
                        + "Le VPN metier et la telephonie softphone sont impactes.",
                TicketCategory.PANNE,
                TicketPriority.CRITICAL,
                client2,
                fibre,
                clientUser2,
                agent2);

        createTicket(
                "Ouverture de 12 canaux SIP supplementaires",
                "Le centre de relation client demande 12 canaux SIP supplementaires sur le trunk "
                        + "principal avant la prochaine campagne d'appels sortants.",
                TicketCategory.DEMANDE,
                TicketPriority.MEDIUM,
                client2,
                voip,
                clientUser2,
                null);

        createTicket(
                "Perte de remontee des KPI radio dans Core Network OSS",
                "Les tableaux NOC n'affichent plus les KPI radio 2G et 4G pour une partie du parc "
                        + "depuis 01:00. La supervision temps reel est partiellement indisponible.",
                TicketCategory.PANNE,
                TicketPriority.HIGH,
                client1,
                network,
                clientUser1,
                agent1);

        log.info("=== H2 telecom demo data initialization complete ===");
        log.info("Seed accounts created:");
        log.info("  - admin@mts-telecom.ma / {} (ADMIN)", DEMO_PASSWORD);
        log.info("  - manager@mts-telecom.ma / {} (MANAGER)", DEMO_PASSWORD);
        log.info("  - karim.agent@mts-telecom.ma / {} (AGENT)", DEMO_PASSWORD);
        log.info("  - layla.agent@mts-telecom.ma / {} (AGENT)", DEMO_PASSWORD);
        log.info("  - support@atlas-distribution.ma / {} (CLIENT)", DEMO_PASSWORD);
        log.info("  - dsi@sahara-connect.ma / {} (CLIENT)", DEMO_PASSWORD);
    }

    private User createUser(String email, String firstName, String lastName, UserRole role) {
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(DEMO_PASSWORD))
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
        return createService(name, "Service telecom " + name, category, creator);
    }

    private TelecomService createService(
            String name,
            String description,
            ServiceCategory category,
            User creator
    ) {
        TelecomService service = TelecomService.builder()
                .name(name)
                .description(description)
                .category(category)
                .isActive(true)
                .createdBy(creator)
                .build();
        return serviceRepository.save(service);
    }

    private void createTicket(
            String title,
            String description,
            TicketCategory category,
            TicketPriority priority,
            Client client,
            TelecomService service,
            User createdBy,
            User assignedTo
    ) {
        int slaHours = priority.getSlaHours();
        TicketStatus status = assignedTo != null ? TicketStatus.IN_PROGRESS : TicketStatus.NEW;

        Ticket ticket = Ticket.builder()
                .ticketNumber(generateTicketNumber())
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
