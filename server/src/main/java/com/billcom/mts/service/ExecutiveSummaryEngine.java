package com.billcom.mts.service;

import com.billcom.mts.entity.Incident;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.enums.TicketPriority;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

// =============================================================================
// EXECUTIVE SUMMARY ENGINE
// Moteur de génération de résumé exécutif en français
// Règles purement algorithmiques — pas de LLM
// =============================================================================
/**
 * Génère un résumé exécutif en texte français à partir de KPIs calculés.
 *
 * RÈGLES DE GÉNÉRATION:
 * 1. En-tête: période couverte, nombre de services/tickets/incidents
 * 2. SLA: si conformité < 90% → alerte rouge  ;  < 95% → avertissement
 * 3. Backlog: si backlog actuel > 0 → mention; si > 20 → alerte engorgement
 * 4. Incidents: si incidents critiques > 0 → alerte instabilité
 * 5. Tickets critiques ouverts: si > 0 → alerte escalade
 * 6. Top incidents par sévérité (max 5)
 * 7. Conclusion avec recommandation
 *
 * DESIGN:
 * - Code pur, testable (pas de dépendance Spring sauf @Component)
 * - Entrée: ReportKpis (POJO immuable)
 * - Sortie: String (texte français formaté)
 */
@Component
public class ExecutiveSummaryEngine {

    private static final DateTimeFormatter FR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // =====================================================================
    // POJO des KPIs en entrée
    // =====================================================================

    /**
     * Données consolidées utilisées pour générer le résumé.
     * Construit par le ReportGenerationService avant appel au moteur.
     */
    @Data
    @Builder
    public static class ReportKpis {
        private LocalDate periodStart;
        private LocalDate periodEnd;

        // — Tickets —
        private long ticketsCreated;
        private long ticketsResolved;
        private long ticketsCritical;        // créés avec priorité CRITICAL
        private long ticketsSlaBreached;     // tickets avec SLA dépassé
        private long backlogCount;           // tickets ouverts non résolus

        // — Incidents —
        private long incidentsCount;
        private long incidentsCritical;

        // — SLA —
        /** % de conformité SLA: (total - breached) / total * 100 */
        private double slaCompliancePct;

        // — Top incidents —
        private List<IncidentSummary> topIncidents;

        // — Top tickets critiques —
        private List<TicketSummary> topCriticalTickets;

        // — Distributions —
        private Map<String, Long> ticketsByStatus;
        private Map<String, Long> ticketsByPriority;
        private Map<String, Long> incidentsBySeverity;
    }

    /** Petit résumé d'un incident pour le rapport textuel. */
    @Data
    @Builder
    public static class IncidentSummary {
        private String incidentNumber;
        private String title;
        private String severity;       // label fr
        private String status;         // label fr
        private String serviceName;
    }

    /** Petit résumé d'un ticket critique. */
    @Data
    @Builder
    public static class TicketSummary {
        private String ticketNumber;
        private String title;
        private String priority;       // label fr
        private String status;         // label fr
        private boolean slaBreached;
    }

    // =====================================================================
    // MÉTHODE PRINCIPALE
    // =====================================================================

    /**
     * Génère le résumé exécutif en texte brut (français).
     *
     * @param kpis les KPIs agrégés de la période
     * @return résumé exécutif multi-paragraphe en français
     */
    public String generate(ReportKpis kpis) {
        StringBuilder sb = new StringBuilder();

        // ---- EN-TÊTE ----
        sb.append("=== RÉSUMÉ EXÉCUTIF ===\n\n");
        sb.append(String.format("Période couverte : %s au %s\n",
                kpis.getPeriodStart().format(FR_DATE),
                kpis.getPeriodEnd().format(FR_DATE)));
        sb.append(String.format("Tickets créés : %d  |  Tickets résolus : %d  |  Incidents : %d\n\n",
                kpis.getTicketsCreated(), kpis.getTicketsResolved(), kpis.getIncidentsCount()));

        // ---- SECTION SLA ----
        sb.append("— Conformité SLA —\n");
        double sla = kpis.getSlaCompliancePct();
        sb.append(String.format("Taux de conformité SLA : %.1f%%\n", sla));

        if (sla < 90.0) {
            sb.append("⚠ ALERTE : La conformité SLA est inférieure à 90%. ")
              .append("Risque de non-respect des engagements contractuels. ")
              .append("Recommandation : revoir immédiatement l'attribution des tickets et les délais de réponse.\n");
        } else if (sla < 95.0) {
            sb.append("⚠ Attention : La conformité SLA est en dessous de l'objectif de 95%. ")
              .append("Surveillance renforcée recommandée.\n");
        } else {
            sb.append("✓ La conformité SLA est dans les objectifs (≥ 95%).\n");
        }

        if (kpis.getTicketsSlaBreached() > 0) {
            sb.append(String.format("%d ticket(s) ont dépassé le SLA sur cette période.\n",
                    kpis.getTicketsSlaBreached()));
        }
        sb.append('\n');

        // ---- SECTION BACKLOG ----
        sb.append("— Backlog —\n");
        long backlog = kpis.getBacklogCount();
        if (backlog == 0) {
            sb.append("✓ Aucun ticket en backlog. L'équipe est à jour.\n");
        } else if (backlog <= 10) {
            sb.append(String.format("%d ticket(s) en backlog. Niveau acceptable.\n", backlog));
        } else if (backlog <= 20) {
            sb.append(String.format("⚠ %d tickets en backlog. Tendance à surveiller.\n", backlog));
        } else {
            sb.append(String.format("⚠ ALERTE : %d tickets en backlog. ", backlog))
              .append("Risque d'engorgement détecté. ")
              .append("Recommandation : renforcer l'équipe ou prioriser les tickets critiques.\n");
        }
        sb.append('\n');

        // ---- SECTION INCIDENTS ----
        sb.append("— Incidents —\n");
        sb.append(String.format("Total incidents sur la période : %d\n", kpis.getIncidentsCount()));

        if (kpis.getIncidentsCritical() > 0) {
            sb.append(String.format("⚠ ALERTE INSTABILITÉ : %d incident(s) critique(s) (P1) détecté(s). ",
                    kpis.getIncidentsCritical()));
            sb.append("Cela peut indiquer une instabilité systémique. ");
            sb.append("Recommandation : planifier un post-mortem global et vérifier les dépendances critiques.\n");
        }

        if (kpis.getIncidentsCount() > 5) {
            sb.append(String.format("Note : %d incidents sur la période représentent une fréquence élevée. ",
                    kpis.getIncidentsCount()));
            sb.append("Analyse des causes racines recommandée.\n");
        }

        // Top incidents
        if (kpis.getTopIncidents() != null && !kpis.getTopIncidents().isEmpty()) {
            sb.append("\nPrincipaux incidents :\n");
            for (int i = 0; i < Math.min(5, kpis.getTopIncidents().size()); i++) {
                IncidentSummary inc = kpis.getTopIncidents().get(i);
                sb.append(String.format("  %d. [%s] %s — Sévérité: %s, Statut: %s",
                        i + 1,
                        inc.getIncidentNumber() != null ? inc.getIncidentNumber() : "N/A",
                        inc.getTitle(),
                        inc.getSeverity(),
                        inc.getStatus()));
                if (inc.getServiceName() != null) {
                    sb.append(String.format(" (Service: %s)", inc.getServiceName()));
                }
                sb.append('\n');
            }
        }
        sb.append('\n');

        // ---- SECTION TICKETS CRITIQUES ----
        sb.append("— Tickets Critiques —\n");
        if (kpis.getTicketsCritical() == 0) {
            sb.append("✓ Aucun ticket critique créé sur cette période.\n");
        } else {
            sb.append(String.format("%d ticket(s) critique(s) créé(s) sur la période.\n",
                    kpis.getTicketsCritical()));

            if (kpis.getTopCriticalTickets() != null && !kpis.getTopCriticalTickets().isEmpty()) {
                sb.append("Détail :\n");
                for (int i = 0; i < Math.min(5, kpis.getTopCriticalTickets().size()); i++) {
                    TicketSummary t = kpis.getTopCriticalTickets().get(i);
                    sb.append(String.format("  %d. [%s] %s — %s",
                            i + 1,
                            t.getTicketNumber() != null ? t.getTicketNumber() : "N/A",
                            t.getTitle(),
                            t.getStatus()));
                    if (t.isSlaBreached()) {
                        sb.append(" [SLA DÉPASSÉ]");
                    }
                    sb.append('\n');
                }
            }
        }
        sb.append('\n');

        // ---- DISTRIBUTIONS ----
        if (kpis.getTicketsByStatus() != null && !kpis.getTicketsByStatus().isEmpty()) {
            sb.append("— Répartition par statut —\n");
            kpis.getTicketsByStatus().forEach((status, count) ->
                    sb.append(String.format("  %s : %d\n", status, count)));
            sb.append('\n');
        }

        if (kpis.getTicketsByPriority() != null && !kpis.getTicketsByPriority().isEmpty()) {
            sb.append("— Répartition par priorité —\n");
            kpis.getTicketsByPriority().forEach((priority, count) ->
                    sb.append(String.format("  %s : %d\n", priority, count)));
            sb.append('\n');
        }

        // ---- CONCLUSION ----
        sb.append("— Conclusion —\n");
        double resolutionRate = kpis.getTicketsCreated() > 0
                ? (double) kpis.getTicketsResolved() / kpis.getTicketsCreated() * 100.0
                : 100.0;
        sb.append(String.format("Taux de résolution : %.1f%% (%d résolus / %d créés)\n",
                resolutionRate, kpis.getTicketsResolved(), kpis.getTicketsCreated()));

        if (resolutionRate >= 90 && sla >= 95 && kpis.getIncidentsCritical() == 0) {
            sb.append("✓ Situation globale satisfaisante. Les indicateurs sont au vert.\n");
        } else if (resolutionRate < 50 || sla < 80) {
            sb.append("⚠ Situation préoccupante. Actions correctives urgentes recommandées.\n");
        } else {
            sb.append("Situation à surveiller. Certains indicateurs méritent une attention particulière.\n");
        }

        return sb.toString();
    }

    // =====================================================================
    // MÉTHODES UTILITAIRES STATIQUES (pour construire les KPIs)
    // =====================================================================

    /**
     * Construit la liste des résumés d'incidents à partir des entités.
     * Utilisable par le service de génération.
     */
    public static List<IncidentSummary> buildIncidentSummaries(List<Incident> incidents) {
        if (incidents == null) return Collections.emptyList();
        return incidents.stream()
                .sorted(Comparator.comparing(i -> i.getSeverity().getPriority()))
                .limit(5)
                .map(i -> IncidentSummary.builder()
                        .incidentNumber(i.getIncidentNumber())
                        .title(i.getTitle())
                        .severity(i.getSeverity().getLabel())
                        .status(i.getStatus().getLabel())
                        .serviceName(i.getService() != null ? i.getService().getName() : null)
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Construit la liste des résumés de tickets critiques.
     */
    public static List<TicketSummary> buildCriticalTicketSummaries(List<Ticket> tickets) {
        if (tickets == null) return Collections.emptyList();
        return tickets.stream()
                .filter(t -> t.getPriority() == TicketPriority.CRITICAL)
                .sorted(Comparator.comparing(Ticket::getCreatedAt).reversed())
                .limit(5)
                .map(t -> TicketSummary.builder()
                        .ticketNumber(t.getTicketNumber())
                        .title(t.getTitle())
                        .priority(priorityLabel(t.getPriority()))
                        .status(t.getStatus() != null ? t.getStatus().getLabel() : "N/A")
                        .slaBreached(Boolean.TRUE.equals(t.getBreachedSla()))
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Calcule le % de conformité SLA.
     * Formule: (total - brèches) / total * 100
     * Retourne 100% si aucun ticket.
     */
    public static double computeSlaCompliance(long totalTickets, long slaBreached) {
        if (totalTickets == 0) return 100.0;
        return (double) (totalTickets - slaBreached) / totalTickets * 100.0;
    }

    /**
     * Retourne le libellé français d'une priorité ticket.
     * TicketPriority n'a pas de getLabel() — on mappe manuellement.
     */
    private static String priorityLabel(TicketPriority p) {
        if (p == null) return "N/A";
        switch (p) {
            case CRITICAL: return "Critique";
            case HIGH:     return "Haute";
            case MEDIUM:   return "Moyenne";
            case LOW:      return "Basse";
            default:       return p.name();
        }
    }
}
