package com.billcom.mts.service;

import com.billcom.mts.dto.report.GenerateReportRequest;
import com.billcom.mts.dto.report.ReportResponse;
import com.billcom.mts.entity.*;
import com.billcom.mts.enums.ReportSource;
import com.billcom.mts.enums.ReportType;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.*;
import com.billcom.mts.service.ExecutiveSummaryEngine.ReportKpis;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

// =============================================================================
// SERVICE DE GÉNÉRATION DE RAPPORTS (PDF + CSV)
// V29 – Filtres avancés, Executive Summary, export multi-format
// =============================================================================
/**
 * ReportGenerationService - Génère des rapports périodiques enrichis.
 *
 * FONCTIONNALITÉS V29:
 * - Filtres avancés: service, équipe, client, statut ticket
 * - Executive Summary automatique (via ExecutiveSummaryEngine)
 * - Export PDF professionnel avec sections KPI, SLA, distributions
 * - Export CSV tabulaire avec en-têtes et colonnes complètes
 * - KPIs embarqués dans la réponse JSON
 *
 * FLUX DE GÉNÉRATION:
 * 1. Valider les paramètres (période, filtres)
 * 2. Requêter les données avec filtres appliqués
 * 3. Calculer les KPIs (SLA, backlog, distributions)
 * 4. Générer le résumé exécutif (ExecutiveSummaryEngine)
 * 5. Produire le fichier (PDF ou CSV)
 * 6. Enregistrer en base avec traçabilité des filtres
 * 7. Retourner ReportResponse avec KPIs embarqués
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportGenerationService {

    private final TicketRepository ticketRepository;
    private final IncidentRepository incidentRepository;
    private final ReportRepository reportRepository;
    private final TelecomServiceRepository telecomServiceRepository;
    private final ClientRepository clientRepository;
    private final ExecutiveSummaryEngine executiveSummaryEngine;

    @Value("${reports.upload-dir:uploads/reports}")
    private String uploadDir;

    private static final DateTimeFormatter LABEL_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // =========================================================================
    // MÉTHODE PRINCIPALE – Génération de rapport
    // =========================================================================

    /**
     * Génère un rapport enrichi pour la période donnée avec filtres optionnels.
     *
     * @param request  paramètres de génération (type, période, filtres, format)
     * @param currentUser utilisateur exécutant la génération
     * @return ReportResponse avec KPIs embarqués et executive summary
     */
    @Transactional
    public ReportResponse generateReport(GenerateReportRequest request, User currentUser) {
        LocalDate periodStart = request.getPeriodStart();
        LocalDate periodEnd = request.getPeriodEnd();

        if (periodEnd.isBefore(periodStart)) {
            throw new BadRequestException("La date de fin doit être après la date de début");
        }

        // Détermine le format de sortie (PDF par défaut)
        String format = (request.getFormat() != null && "CSV".equalsIgnoreCase(request.getFormat()))
                ? "CSV" : "PDF";

        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime to = periodEnd.plusDays(1).atStartOfDay();

        // --- Résolution des filtres ---
        TelecomService serviceFilter = null;
        if (request.getServiceId() != null && telecomServiceRepository != null) {
            serviceFilter = telecomServiceRepository.findById(request.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service", "id", request.getServiceId()));
        }
        Client clientFilter = null;
        if (request.getClientId() != null && clientRepository != null) {
            clientFilter = clientRepository.findById(request.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Client", "id", request.getClientId()));
        }

        // --- Requêtes données avec filtres ---
        List<Ticket> ticketsInPeriod = fetchFilteredTickets(from, to, request);
        List<Incident> incidentsInPeriod = incidentRepository != null
                ? incidentRepository.findByPeriod(from, to)
                : List.of();

        // --- Calcul des KPIs ---
        long ticketsCreated = ticketsInPeriod.size();
        long ticketsResolved = ticketsInPeriod.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED)
                .count();
        long ticketsCritical = ticketRepository.countCriticalBetween(from, to);
        long ticketsSlaBreached = ticketRepository.countSlaBreachedBetween(from, to);
        long backlogCount = ticketRepository.countBacklogAt(to);
        long incidentsCount = incidentsInPeriod.size();
        long incidentsCritical = incidentRepository != null
                ? incidentRepository.countCriticalByPeriod(from, to)
                : 0L;
        double slaCompliancePct = ExecutiveSummaryEngine.computeSlaCompliance(ticketsCreated, ticketsSlaBreached);

        // Distributions
        Map<String, Long> byStatus = ticketsInPeriod.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getStatus() != null ? t.getStatus().name() : "N/A",
                        Collectors.counting()));
        Map<String, Long> byPriority = ticketsInPeriod.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getPriority() != null ? t.getPriority().name() : "N/A",
                        Collectors.counting()));
        Map<String, Long> incidentsBySeverity = incidentsInPeriod.stream()
                .collect(Collectors.groupingBy(
                        i -> i.getSeverity() != null ? i.getSeverity().name() : "N/A",
                        Collectors.counting()));

        // --- Construction des KPIs pour le moteur Executive Summary ---
        ReportKpis kpis = ReportKpis.builder()
                .periodStart(periodStart)
                .periodEnd(periodEnd)
                .ticketsCreated(ticketsCreated)
                .ticketsResolved(ticketsResolved)
                .ticketsCritical(ticketsCritical)
                .ticketsSlaBreached(ticketsSlaBreached)
                .backlogCount(backlogCount)
                .incidentsCount(incidentsCount)
                .incidentsCritical(incidentsCritical)
                .slaCompliancePct(slaCompliancePct)
                .topIncidents(ExecutiveSummaryEngine.buildIncidentSummaries(incidentsInPeriod))
                .topCriticalTickets(ExecutiveSummaryEngine.buildCriticalTicketSummaries(ticketsInPeriod))
                .ticketsByStatus(byStatus)
                .ticketsByPriority(byPriority)
                .incidentsBySeverity(incidentsBySeverity)
                .build();

        // --- Génération du résumé exécutif ---
        String executiveSummary = executiveSummaryEngine != null
                ? executiveSummaryEngine.generate(kpis)
                : "";

        // --- Titre et description ---
        ReportType reportType = request.getReportType();
        String title = String.format("Rapport %s - %s à %s",
                reportType.getLabel(),
                periodStart.format(LABEL_FORMAT),
                periodEnd.format(LABEL_FORMAT));
        String description = String.format(
                "Rapport généré automatiquement (%s). Période: %s - %s. "
                + "Tickets créés: %d, résolus: %d, critiques: %d. "
                + "Incidents: %d (dont %d critiques). SLA: %.1f%%.",
                format, periodStart, periodEnd,
                ticketsCreated, ticketsResolved, ticketsCritical,
                incidentsCount, incidentsCritical, slaCompliancePct);

        // --- Génération du fichier (PDF ou CSV) ---
        byte[] fileBytes;
        String mimeType;
        String fileExtension;

        if ("CSV".equals(format)) {
            fileBytes = buildCsv(title, periodStart, periodEnd, ticketsInPeriod, kpis, executiveSummary);
            mimeType = "text/csv";
            fileExtension = ".csv";
        } else {
            fileBytes = buildPdf(title, periodStart, periodEnd, kpis, executiveSummary, byStatus, byPriority);
            mimeType = "application/pdf";
            fileExtension = ".pdf";
        }

        // --- Sauvegarde du fichier ---
        String yearMonth = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        Path targetDir = Paths.get(uploadDir, yearMonth);
        try {
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            String uniqueFileName = "generated_" + UUID.randomUUID().toString() + fileExtension;
            Path targetPath = targetDir.resolve(uniqueFileName);
            Files.write(targetPath, fileBytes);

            boolean publish = request.getPublish() != null && request.getPublish();

            Report report = Report.builder()
                    .title(title)
                    .description(description)
                    .executiveSummary(executiveSummary)
                    .reportType(reportType)
                    .periodStart(periodStart)
                    .periodEnd(periodEnd)
                    .fileName(uniqueFileName)
                    .filePath(targetPath.toString())
                    .fileSize((long) fileBytes.length)
                    .mimeType(mimeType)
                    .format(format)
                    .service(null)
                    .serviceFilter(serviceFilter)
                    .teamFilter(request.getTeam())
                    .clientFilter(clientFilter)
                    .statusFilter(request.getTicketStatus())
                    .createdBy(currentUser)
                    .downloadCount(0)
                    .isPublished(publish)
                    .source(ReportSource.GENERATED)
                    .build();
            report = reportRepository.save(report);

            log.info("[Report] Rapport {} généré (format={}) ID {} par {} pour période {} - {}",
                    reportType, format, report.getId(), currentUser.getEmail(), periodStart, periodEnd);

            return mapToResponse(report, kpis);
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'enregistrement du rapport généré", e);
        }
    }

    // =========================================================================
    // REQUÊTAGE DES TICKETS AVEC FILTRES
    // =========================================================================

    /**
     * Récupère les tickets de la période en appliquant les filtres optionnels.
     * Priorité des filtres: service > client > team > statut.
     * Si aucun filtre → tous les tickets de la période.
     */
    private List<Ticket> fetchFilteredTickets(LocalDateTime from, LocalDateTime to,
                                               GenerateReportRequest request) {
        List<Ticket> tickets;

        if (request.getServiceId() != null) {
            tickets = ticketRepository.findByCreatedAtBetweenAndServiceId(from, to, request.getServiceId());
        } else if (request.getClientId() != null) {
            tickets = ticketRepository.findByCreatedAtBetweenAndClientId(from, to, request.getClientId());
        } else if (request.getTeam() != null && !request.getTeam().isBlank()) {
            tickets = ticketRepository.findByCreatedAtBetweenAndTeam(from, to, request.getTeam());
        } else {
            tickets = ticketRepository.findByCreatedAtBetween(from, to);
        }

        // Filtre additionnel par statut si demandé
        if (request.getTicketStatus() != null && !request.getTicketStatus().isBlank()) {
            String statusFilter = request.getTicketStatus().toUpperCase();
            tickets = tickets.stream()
                    .filter(t -> t.getStatus() != null && t.getStatus().name().equals(statusFilter))
                    .collect(Collectors.toList());
        }

        return tickets;
    }

    // =========================================================================
    // CONSTRUCTION PDF ENRICHI
    // =========================================================================

    /**
     * Construit un PDF professionnel avec:
     * - En-tête et métadonnées
     * - Résumé exécutif complet
     * - Tableau des KPIs principaux
     * - Répartition par statut et priorité
     * - Section incidents
     */
    private byte[] buildPdf(String title, LocalDate periodStart, LocalDate periodEnd,
                            ReportKpis kpis, String executiveSummary,
                            Map<String, Long> byStatus, Map<String, Long> byPriority) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Polices
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
            Font subheadingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font alertFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);

            // ---- EN-TÊTE ----
            document.add(new Paragraph(title, titleFont));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Période: " + periodStart.format(LABEL_FORMAT)
                    + " - " + periodEnd.format(LABEL_FORMAT), normalFont));
            document.add(new Paragraph("Généré le: " + LocalDateTime.now().format(TIMESTAMP_FORMAT), normalFont));
            document.add(new Paragraph("Format: PDF — Rapport généré automatiquement par MTS Telecom", smallFont));
            document.add(new Paragraph(" "));

            // ---- EXECUTIVE SUMMARY ----
            document.add(new Paragraph("Résumé Exécutif", headingFont));
            document.add(new Paragraph(" "));
            // Le résumé peut contenir des lignes avec symboles ⚠ ✓ — on les affiche tels quels
            for (String line : executiveSummary.split("\n")) {
                if (line.startsWith("===") || line.startsWith("—")) {
                    document.add(new Paragraph(line, subheadingFont));
                } else if (line.contains("ALERTE") || line.contains("⚠")) {
                    document.add(new Paragraph(line, alertFont));
                } else {
                    document.add(new Paragraph(line, normalFont));
                }
            }
            document.add(new Paragraph(" "));

            // ---- TABLEAU KPIs PRINCIPAUX ----
            document.add(new Paragraph("Indicateurs Clés de Performance", headingFont));
            PdfPTable kpiTable = new PdfPTable(2);
            kpiTable.setWidthPercentage(100);
            kpiTable.setSpacingBefore(5);
            kpiTable.setWidths(new float[]{60, 40});
            addKpiRow(kpiTable, "Tickets créés", String.valueOf(kpis.getTicketsCreated()), normalFont);
            addKpiRow(kpiTable, "Tickets résolus", String.valueOf(kpis.getTicketsResolved()), normalFont);
            addKpiRow(kpiTable, "Tickets critiques", String.valueOf(kpis.getTicketsCritical()), normalFont);
            addKpiRow(kpiTable, "Tickets SLA dépassé", String.valueOf(kpis.getTicketsSlaBreached()), normalFont);
            addKpiRow(kpiTable, "Backlog actuel", String.valueOf(kpis.getBacklogCount()), normalFont);
            addKpiRow(kpiTable, "Incidents (total)", String.valueOf(kpis.getIncidentsCount()), normalFont);
            addKpiRow(kpiTable, "Incidents critiques", String.valueOf(kpis.getIncidentsCritical()), normalFont);
            addKpiRow(kpiTable, "Conformité SLA", String.format("%.1f%%", kpis.getSlaCompliancePct()), normalFont);
            document.add(kpiTable);
            document.add(new Paragraph(" "));

            // ---- TICKETS PAR STATUT ----
            if (!byStatus.isEmpty()) {
                document.add(new Paragraph("Tickets par statut", headingFont));
                PdfPTable statusTable = new PdfPTable(2);
                statusTable.setWidthPercentage(100);
                statusTable.setSpacingBefore(5);
                for (Map.Entry<String, Long> e : byStatus.entrySet()) {
                    statusTable.addCell(cell(e.getKey(), normalFont));
                    statusTable.addCell(cell(String.valueOf(e.getValue()), normalFont));
                }
                document.add(statusTable);
                document.add(new Paragraph(" "));
            }

            // ---- TICKETS PAR PRIORITÉ ----
            if (!byPriority.isEmpty()) {
                document.add(new Paragraph("Tickets par priorité", headingFont));
                PdfPTable priorityTable = new PdfPTable(2);
                priorityTable.setWidthPercentage(100);
                priorityTable.setSpacingBefore(5);
                for (Map.Entry<String, Long> e : byPriority.entrySet()) {
                    priorityTable.addCell(cell(e.getKey(), normalFont));
                    priorityTable.addCell(cell(String.valueOf(e.getValue()), normalFont));
                }
                document.add(priorityTable);
            }

            document.close();
            return baos.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new RuntimeException("Erreur génération PDF", e);
        }
    }

    /** Ajoute une ligne KPI au tableau (label + valeur). */
    private void addKpiRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        labelCell.setBorderWidth(0.5f);
        labelCell.setPadding(4);
        table.addCell(labelCell);

        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        PdfPCell valueCell = new PdfPCell(new Phrase(value, boldFont));
        valueCell.setBorderWidth(0.5f);
        valueCell.setPadding(4);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);
    }

    private static PdfPCell cell(String text, Font font) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setBorderWidth(0.5f);
        c.setPadding(4);
        return c;
    }

    // =========================================================================
    // CONSTRUCTION CSV
    // =========================================================================

    /**
     * Construit un fichier CSV UTF-8 avec BOM pour compatibilité Excel.
     *
     * Structure du CSV:
     * - Section 1: Métadonnées (titre, période, date génération)
     * - Section 2: KPIs (une ligne par indicateur)
     * - Section 3: Résumé exécutif (texte multi-ligne)
     * - Section 4: Liste des tickets (tableau complet)
     *
     * COMMENTÉ: Le BOM UTF-8 (EF BB BF) assure l'ouverture correcte
     * dans Excel avec les accents français.
     */
    private byte[] buildCsv(String title, LocalDate periodStart, LocalDate periodEnd,
                            List<Ticket> tickets, ReportKpis kpis, String executiveSummary) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // BOM UTF-8 pour compatibilité Excel
            baos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

            try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {
                // ---- SECTION MÉTADONNÉES ----
                pw.println("# RAPPORT MTS TELECOM");
                pw.println("# " + title);
                pw.println("# Période: " + periodStart.format(LABEL_FORMAT) + " - " + periodEnd.format(LABEL_FORMAT));
                pw.println("# Généré le: " + LocalDateTime.now().format(TIMESTAMP_FORMAT));
                pw.println();

                // ---- SECTION KPIs ----
                pw.println("# === INDICATEURS CLÉS ===");
                pw.println("Indicateur;Valeur");
                pw.println("Tickets créés;" + kpis.getTicketsCreated());
                pw.println("Tickets résolus;" + kpis.getTicketsResolved());
                pw.println("Tickets critiques;" + kpis.getTicketsCritical());
                pw.println("Tickets SLA dépassé;" + kpis.getTicketsSlaBreached());
                pw.println("Backlog actuel;" + kpis.getBacklogCount());
                pw.println("Incidents total;" + kpis.getIncidentsCount());
                pw.println("Incidents critiques;" + kpis.getIncidentsCritical());
                pw.println(String.format("Conformité SLA;%.1f%%", kpis.getSlaCompliancePct()));
                pw.println();

                // ---- SECTION RÉSUMÉ EXÉCUTIF ----
                pw.println("# === RÉSUMÉ EXÉCUTIF ===");
                for (String line : executiveSummary.split("\n")) {
                    pw.println("# " + line);
                }
                pw.println();

                // ---- SECTION TICKETS (TABLEAU) ----
                pw.println("# === LISTE DES TICKETS ===");
                pw.println("N° Ticket;Titre;Statut;Priorité;Créé le;SLA Dépassé;Assigné à;Service;Client");

                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                for (Ticket t : tickets) {
                    pw.println(String.join(";",
                            escapeCsv(t.getTicketNumber()),
                            escapeCsv(t.getTitle()),
                            t.getStatus() != null ? t.getStatus().name() : "N/A",
                            t.getPriority() != null ? t.getPriority().name() : "N/A",
                            t.getCreatedAt() != null ? t.getCreatedAt().format(dtf) : "N/A",
                            Boolean.TRUE.equals(t.getBreachedSla()) ? "OUI" : "NON",
                            t.getAssignedTo() != null ? escapeCsv(t.getAssignedTo().getFullName()) : "Non assigné",
                            t.getService() != null ? escapeCsv(t.getService().getName()) : "N/A",
                            t.getClient() != null ? escapeCsv(t.getClient().getCompanyName()) : "N/A"
                    ));
                }

                pw.flush();
            }

            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erreur génération CSV", e);
        }
    }

    /**
     * Échappe une valeur CSV: guillemets doubles si elle contient un séparateur, un guillemet ou un saut de ligne.
     */
    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    // =========================================================================
    // MAPPING VERS DTO AVEC KPIs EMBARQUÉS
    // =========================================================================

    /**
     * Mappe un Report + KPIs vers ReportResponse enrichi V29.
     * Les KPIs sont inclus dans la réponse JSON pour affichage frontend.
     */
    private ReportResponse mapToResponse(Report report, ReportKpis kpis) {
        return ReportResponse.builder()
                .id(report.getId())
                .title(report.getTitle())
                .description(report.getDescription())
                .executiveSummary(report.getExecutiveSummary())
                .reportType(report.getReportType().name())
                .reportTypeLabel(report.getReportType().getLabel())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .formattedPeriod(report.getFormattedPeriod())
                .fileName(report.getFileName())
                .fileSize(report.getFileSize())
                .formattedFileSize(report.getFormattedFileSize())
                .mimeType(report.getMimeType())
                .format(report.getFormat())
                .serviceId(report.getService() != null ? report.getService().getId() : null)
                .serviceName(report.getService() != null ? report.getService().getName() : null)
                .serviceFilterId(report.getServiceFilter() != null ? report.getServiceFilter().getId() : null)
                .serviceFilterName(report.getServiceFilter() != null ? report.getServiceFilter().getName() : null)
                .teamFilter(report.getTeamFilter())
                .clientFilterId(report.getClientFilter() != null ? report.getClientFilter().getId() : null)
                .clientFilterName(report.getClientFilter() != null ? report.getClientFilter().getCompanyName() : null)
                .statusFilter(report.getStatusFilter())
                .createdById(report.getCreatedBy().getId())
                .createdByName(report.getCreatedBy().getFullName())
                .downloadCount(report.getDownloadCount())
                .isPublished(report.getIsPublished())
                .source(report.getSource() != null ? report.getSource().name() : "UPLOADED")
                .sourceLabel(report.getSource() != null ? report.getSource().getLabel() : "Uploadé")
                // KPIs embarqués
                .ticketsCreated(kpis.getTicketsCreated())
                .ticketsResolved(kpis.getTicketsResolved())
                .ticketsCritical(kpis.getTicketsCritical())
                .ticketsSlaBreached(kpis.getTicketsSlaBreached())
                .incidentsCount(kpis.getIncidentsCount())
                .incidentsCritical(kpis.getIncidentsCritical())
                .slaCompliancePct(kpis.getSlaCompliancePct())
                .backlogCount(kpis.getBacklogCount())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}
