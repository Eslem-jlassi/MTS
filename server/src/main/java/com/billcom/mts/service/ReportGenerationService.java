package com.billcom.mts.service;

import com.billcom.mts.dto.report.GenerateReportRequest;
import com.billcom.mts.dto.report.ReportResponse;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.Incident;
import com.billcom.mts.entity.Report;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ReportSource;
import com.billcom.mts.enums.ReportType;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.IncidentRepository;
import com.billcom.mts.repository.ReportRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.service.ExecutiveSummaryEngine.ReportKpis;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.awt.Color;
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
// SERVICE DE GENERATION DE RAPPORTS (PDF + CSV)
// =============================================================================
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

    @Transactional
    public ReportResponse generateReport(GenerateReportRequest request, User currentUser) {
        LocalDate periodStart = request.getPeriodStart();
        LocalDate periodEnd = request.getPeriodEnd();

        if (periodEnd.isBefore(periodStart)) {
            throw new BadRequestException("La date de fin doit etre apres la date de debut");
        }

        String format =
                request.getFormat() != null && "CSV".equalsIgnoreCase(request.getFormat()) ? "CSV" : "PDF";

        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime to = periodEnd.plusDays(1).atStartOfDay();

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

        List<Ticket> ticketsInPeriod = fetchFilteredTickets(from, to, request);
        List<Incident> incidentsInPeriod = incidentRepository != null ? incidentRepository.findByPeriod(from, to) : List.of();

        long ticketsCreated = ticketsInPeriod.size();
        long ticketsResolved = ticketsInPeriod.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED)
                .count();
        long ticketsCritical = ticketRepository.countCriticalBetween(from, to);
        long ticketsSlaBreached = ticketRepository.countSlaBreachedBetween(from, to);
        long backlogCount = ticketRepository.countBacklogAt(to);
        long incidentsCount = incidentsInPeriod.size();
        long incidentsCritical = incidentRepository != null ? incidentRepository.countCriticalByPeriod(from, to) : 0L;
        double slaCompliancePct = ExecutiveSummaryEngine.computeSlaCompliance(ticketsCreated, ticketsSlaBreached);

        Map<String, Long> byStatus = ticketsInPeriod.stream()
                .collect(Collectors.groupingBy(
                        ticket -> ticket.getStatus() != null ? ticket.getStatus().name() : "N/A",
                        Collectors.counting()
                ));
        Map<String, Long> byPriority = ticketsInPeriod.stream()
                .collect(Collectors.groupingBy(
                        ticket -> ticket.getPriority() != null ? ticket.getPriority().name() : "N/A",
                        Collectors.counting()
                ));
        Map<String, Long> incidentsBySeverity = incidentsInPeriod.stream()
                .collect(Collectors.groupingBy(
                        incident -> incident.getSeverity() != null ? incident.getSeverity().name() : "N/A",
                        Collectors.counting()
                ));

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

        String executiveSummary = executiveSummaryEngine != null ? executiveSummaryEngine.generate(kpis) : "";

        ReportType reportType = request.getReportType();
        String title = String.format(
                "Rapport %s - %s a %s",
                reportType.getLabel(),
                periodStart.format(LABEL_FORMAT),
                periodEnd.format(LABEL_FORMAT)
        );
        String description = String.format(
                "Rapport genere automatiquement (%s). Periode: %s - %s. "
                        + "Tickets crees: %d, resolus: %d, critiques: %d. "
                        + "Incidents: %d (dont %d critiques). SLA: %.1f%%.",
                format,
                periodStart,
                periodEnd,
                ticketsCreated,
                ticketsResolved,
                ticketsCritical,
                incidentsCount,
                incidentsCritical,
                slaCompliancePct
        );

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

        String yearMonth = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        Path targetDir = Paths.get(uploadDir, yearMonth);

        try {
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            String uniqueFileName = "generated_" + UUID.randomUUID() + fileExtension;
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

            log.info(
                    "[Report] Rapport {} genere (format={}) ID {} par {} pour periode {} - {}",
                    reportType,
                    format,
                    report.getId(),
                    currentUser.getEmail(),
                    periodStart,
                    periodEnd
            );

            return mapToResponse(report, kpis);
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'enregistrement du rapport genere", e);
        }
    }

    private List<Ticket> fetchFilteredTickets(LocalDateTime from, LocalDateTime to, GenerateReportRequest request) {
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

        if (request.getTicketStatus() != null && !request.getTicketStatus().isBlank()) {
            String statusFilter = request.getTicketStatus().toUpperCase();
            tickets = tickets.stream()
                    .filter(ticket -> ticket.getStatus() != null && ticket.getStatus().name().equals(statusFilter))
                    .collect(Collectors.toList());
        }

        return tickets;
    }

    private byte[] buildPdf(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            ReportKpis kpis,
            String executiveSummary,
            Map<String, Long> byStatus,
            Map<String, Long> byPriority
    ) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            document.open();

            document.addTitle(title);
            document.addAuthor("MTS Telecom / Billcom Consulting");
            document.addCreator("MTS Telecom Supervision Platform");
            writer.setViewerPreferences(PdfWriter.PageModeUseOutlines);

            Color brandColor = new Color(17, 54, 89);
            Color accentColor = new Color(231, 111, 46);
            Color headerColor = new Color(236, 243, 248);
            Color softSurface = new Color(248, 250, 252);
            Color warningSurface = new Color(255, 244, 229);

            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            brandFont.setColor(accentColor);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            titleFont.setColor(brandColor);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            sectionFont.setColor(brandColor);
            Font subSectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            subSectionFont.setColor(brandColor);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Font mutedFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
            mutedFont.setColor(new Color(96, 104, 113));
            Font alertFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            alertFont.setColor(accentColor);
            Font headerFontText = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            headerFontText.setColor(brandColor);

            Paragraph brand = new Paragraph("MTS Telecom | Billcom Consulting", brandFont);
            brand.setSpacingAfter(6f);
            document.add(brand);

            Paragraph reportTitle = new Paragraph(title, titleFont);
            reportTitle.setSpacingAfter(10f);
            document.add(reportTitle);

            Paragraph intro = new Paragraph(
                    "Rapport de supervision et support client genere automatiquement a partir des donnees du SI MTS Telecom.",
                    mutedFont
            );
            intro.setSpacingAfter(10f);
            document.add(intro);

            PdfPTable metadataTable = new PdfPTable(2);
            metadataTable.setWidthPercentage(100);
            metadataTable.setSpacingAfter(16f);
            metadataTable.setWidths(new float[]{32, 68});
            addTableHeader(metadataTable, "Champ", "Valeur", headerFontText, headerColor);
            addKpiRow(metadataTable, "Periode", periodStart.format(LABEL_FORMAT) + " - " + periodEnd.format(LABEL_FORMAT), bodyFont);
            addKpiRow(metadataTable, "Genere le", LocalDateTime.now().format(TIMESTAMP_FORMAT), bodyFont);
            addKpiRow(metadataTable, "Format", "PDF", bodyFont);
            addKpiRow(metadataTable, "Edition", "MTS Telecom - Billcom Consulting", bodyFont);
            document.add(metadataTable);

            addSectionTitle(document, "Resume executif", sectionFont);
            addExecutiveSummary(document, executiveSummary, subSectionFont, bodyFont, alertFont, softSurface, warningSurface);
            document.add(Chunk.NEWLINE);

            addSectionTitle(document, "Indicateurs cles", sectionFont);
            PdfPTable kpiTable = new PdfPTable(2);
            kpiTable.setWidthPercentage(100);
            kpiTable.setSpacingBefore(6f);
            kpiTable.setSpacingAfter(12f);
            kpiTable.setWidths(new float[]{60, 40});
            addTableHeader(kpiTable, "Indicateur", "Valeur", headerFontText, headerColor);
            addKpiRow(kpiTable, "Tickets crees", String.valueOf(kpis.getTicketsCreated()), bodyFont);
            addKpiRow(kpiTable, "Tickets resolus", String.valueOf(kpis.getTicketsResolved()), bodyFont);
            addKpiRow(kpiTable, "Tickets critiques", String.valueOf(kpis.getTicketsCritical()), bodyFont);
            addKpiRow(kpiTable, "Tickets SLA depasses", String.valueOf(kpis.getTicketsSlaBreached()), bodyFont);
            addKpiRow(kpiTable, "Backlog actuel", String.valueOf(kpis.getBacklogCount()), bodyFont);
            addKpiRow(kpiTable, "Incidents total", String.valueOf(kpis.getIncidentsCount()), bodyFont);
            addKpiRow(kpiTable, "Incidents critiques", String.valueOf(kpis.getIncidentsCritical()), bodyFont);
            addKpiRow(kpiTable, "Conformite SLA", String.format("%.1f%%", kpis.getSlaCompliancePct()), bodyFont);
            document.add(kpiTable);

            if (!byStatus.isEmpty()) {
                addSectionTitle(document, "Repartition des tickets par statut", sectionFont);
                document.add(buildDistributionTable(byStatus, bodyFont, headerFontText, headerColor));
                document.add(Chunk.NEWLINE);
            }

            if (!byPriority.isEmpty()) {
                addSectionTitle(document, "Repartition des tickets par priorite", sectionFont);
                document.add(buildDistributionTable(byPriority, bodyFont, headerFontText, headerColor));
            }

            document.close();
            return baos.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new RuntimeException("Erreur generation PDF", e);
        }
    }

    private void addSectionTitle(Document document, String title, Font font) throws DocumentException {
        Paragraph paragraph = new Paragraph(title, font);
        paragraph.setSpacingBefore(4f);
        paragraph.setSpacingAfter(8f);
        document.add(paragraph);
    }

    private void addExecutiveSummary(
            Document document,
            String executiveSummary,
            Font subSectionFont,
            Font bodyFont,
            Font alertFont,
            Color defaultBackground,
            Color warningBackground
    ) throws DocumentException {
        PdfPTable summaryTable = new PdfPTable(1);
        summaryTable.setWidthPercentage(100);
        summaryTable.setSpacingBefore(4f);

        if (executiveSummary == null || executiveSummary.isBlank()) {
            PdfPCell emptyCell = new PdfPCell(new Phrase("Aucun resume executif disponible.", bodyFont));
            emptyCell.setBorderWidth(0.4f);
            emptyCell.setPadding(10f);
            emptyCell.setBackgroundColor(defaultBackground);
            summaryTable.addCell(emptyCell);
            document.add(summaryTable);
            return;
        }

        for (String rawLine : executiveSummary.split("\n")) {
            String line = rawLine == null ? "" : rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }

            Font lineFont = bodyFont;
            Color background = defaultBackground;
            String renderedLine = line;

            if (line.startsWith("===")) {
                lineFont = subSectionFont;
                renderedLine = line.replace("=", "").trim();
            } else if (line.toUpperCase().contains("ALERTE")) {
                lineFont = alertFont;
                background = warningBackground;
            } else if (!line.startsWith("-") && !line.startsWith("•")) {
                renderedLine = "• " + line;
            }

            PdfPCell lineCell = new PdfPCell(new Phrase(renderedLine, lineFont));
            lineCell.setBorderWidth(0.4f);
            lineCell.setPadding(9f);
            lineCell.setBackgroundColor(background);
            summaryTable.addCell(lineCell);
        }

        document.add(summaryTable);
    }

    private void addTableHeader(PdfPTable table, String left, String right, Font font, Color backgroundColor) {
        PdfPCell leftHeader = new PdfPCell(new Phrase(left, font));
        leftHeader.setBackgroundColor(backgroundColor);
        leftHeader.setPadding(6f);
        leftHeader.setBorderWidth(0.5f);
        table.addCell(leftHeader);

        PdfPCell rightHeader = new PdfPCell(new Phrase(right, font));
        rightHeader.setBackgroundColor(backgroundColor);
        rightHeader.setPadding(6f);
        rightHeader.setBorderWidth(0.5f);
        rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(rightHeader);
    }

    private void addKpiRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        labelCell.setBorderWidth(0.5f);
        labelCell.setPadding(6f);
        table.addCell(labelCell);

        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        PdfPCell valueCell = new PdfPCell(new Phrase(value, boldFont));
        valueCell.setBorderWidth(0.5f);
        valueCell.setPadding(6f);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);
    }

    private PdfPTable buildDistributionTable(
            Map<String, Long> values,
            Font bodyFont,
            Font headerFont,
                Color headerColor
    ) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4f);
        table.setSpacingAfter(10f);
        addTableHeader(table, "Categorie", "Volume", headerFont, headerColor);

        values.forEach((key, value) -> {
            table.addCell(cell(normalizePdfLabel(key), bodyFont));

            PdfPCell valueCell = cell(String.valueOf(value), bodyFont);
            valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(valueCell);
        });

        return table;
    }

    private PdfPCell cell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorderWidth(0.5f);
        cell.setPadding(6f);
        return cell;
    }

    private String normalizePdfLabel(String label) {
        if (label == null || label.isBlank()) {
            return "N/A";
        }

        return label.replace('_', ' ');
    }

    private byte[] buildCsv(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            List<Ticket> tickets,
            ReportKpis kpis,
            String executiveSummary
    ) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            baos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

            try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {
                pw.println("# RAPPORT MTS TELECOM");
                pw.println("# " + title);
                pw.println("# Periode: " + periodStart.format(LABEL_FORMAT) + " - " + periodEnd.format(LABEL_FORMAT));
                pw.println("# Genere le: " + LocalDateTime.now().format(TIMESTAMP_FORMAT));
                pw.println();

                pw.println("# === INDICATEURS CLES ===");
                pw.println("Indicateur;Valeur");
                pw.println("Tickets crees;" + kpis.getTicketsCreated());
                pw.println("Tickets resolus;" + kpis.getTicketsResolved());
                pw.println("Tickets critiques;" + kpis.getTicketsCritical());
                pw.println("Tickets SLA depasses;" + kpis.getTicketsSlaBreached());
                pw.println("Backlog actuel;" + kpis.getBacklogCount());
                pw.println("Incidents total;" + kpis.getIncidentsCount());
                pw.println("Incidents critiques;" + kpis.getIncidentsCritical());
                pw.println(String.format("Conformite SLA;%.1f%%", kpis.getSlaCompliancePct()));
                pw.println();

                pw.println("# === RESUME EXECUTIF ===");
                for (String line : executiveSummary.split("\n")) {
                    pw.println("# " + line);
                }
                pw.println();

                pw.println("# === LISTE DES TICKETS ===");
                pw.println("N Ticket;Titre;Statut;Priorite;Cree le;SLA depasse;Assigne a;Service;Client");

                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                for (Ticket ticket : tickets) {
                    pw.println(String.join(
                            ";",
                            escapeCsv(ticket.getTicketNumber()),
                            escapeCsv(ticket.getTitle()),
                            ticket.getStatus() != null ? ticket.getStatus().name() : "N/A",
                            ticket.getPriority() != null ? ticket.getPriority().name() : "N/A",
                            ticket.getCreatedAt() != null ? ticket.getCreatedAt().format(dtf) : "N/A",
                            Boolean.TRUE.equals(ticket.getBreachedSla()) ? "OUI" : "NON",
                            ticket.getAssignedTo() != null ? escapeCsv(ticket.getAssignedTo().getFullName()) : "Non assigne",
                            ticket.getService() != null ? escapeCsv(ticket.getService().getName()) : "N/A",
                            ticket.getClient() != null ? escapeCsv(ticket.getClient().getCompanyName()) : "N/A"
                    ));
                }

                pw.flush();
            }

            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erreur generation CSV", e);
        }
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }

        return value;
    }

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
                .sourceLabel(report.getSource() != null ? report.getSource().getLabel() : "Uploade")
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
