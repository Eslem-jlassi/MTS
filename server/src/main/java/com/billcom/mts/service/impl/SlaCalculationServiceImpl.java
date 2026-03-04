package com.billcom.mts.service.impl;

import com.billcom.mts.entity.BusinessHours;
import com.billcom.mts.entity.SlaTimeline;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.repository.SlaTimelineRepository;
import com.billcom.mts.service.SlaCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Implémentation du calcul SLA avec support horaires ouvrés et pauses.
 *
 * <p>Algorithme horaires ouvrés :</p>
 * <ol>
 *   <li>Convertir les slaHours en minutes ouvrées à distribuer</li>
 *   <li>Avancer jour par jour, ne comptant que les heures entre startHour et endHour les jours ouvrés</li>
 *   <li>Tenir compte des minutes de pause cumulées</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlaCalculationServiceImpl implements SlaCalculationService {

    private final SlaTimelineRepository slaTimelineRepository;

    // =========================================================================
    // CALCUL DE DEADLINE
    // =========================================================================

    @Override
    public LocalDateTime calculateDeadline(LocalDateTime startTime, int slaHours, BusinessHours bh) {
        if (bh == null) {
            // Mode 24/7 : simple addition
            return startTime.plusHours(slaHours);
        }

        // Mode horaires ouvrés
        Set<Integer> workDays = parseWorkDays(bh.getWorkDays());
        LocalTime dayStart = LocalTime.of(bh.getStartHour(), 0);
        LocalTime dayEnd = LocalTime.of(bh.getEndHour(), 0);
        long remainingMinutes = slaHours * 60L;

        LocalDateTime cursor = startTime;

        // Si on commence hors horaires ouvrés, avancer au prochain créneau
        cursor = advanceToBusinessTime(cursor, workDays, dayStart, dayEnd);

        while (remainingMinutes > 0) {
            if (!isWorkDay(cursor.toLocalDate(), workDays)) {
                // Jour non ouvré → avancer au jour suivant à dayStart
                cursor = cursor.toLocalDate().plusDays(1).atTime(dayStart);
                continue;
            }

            LocalTime cursorTime = cursor.toLocalTime();
            if (cursorTime.isBefore(dayStart)) {
                cursor = cursor.toLocalDate().atTime(dayStart);
                cursorTime = dayStart;
            }
            if (!cursorTime.isBefore(dayEnd)) {
                // Après fermeture → jour suivant
                cursor = cursor.toLocalDate().plusDays(1).atTime(dayStart);
                continue;
            }

            // Minutes disponibles dans ce créneau
            long availableMinutes = Duration.between(cursorTime, dayEnd).toMinutes();

            if (remainingMinutes <= availableMinutes) {
                return cursor.plusMinutes(remainingMinutes);
            }

            remainingMinutes -= availableMinutes;
            cursor = cursor.toLocalDate().plusDays(1).atTime(dayStart);
        }

        return cursor;
    }

    // =========================================================================
    // POURCENTAGE EFFECTIF
    // =========================================================================

    @Override
    public double calculateEffectivePercentage(Ticket ticket, BusinessHours bh) {
        if (ticket.getSlaHours() == null || ticket.getSlaHours() <= 0) return 0;

        long effectiveMinutes = calculateEffectiveElapsedMinutes(ticket, bh);
        long totalMinutes = ticket.getSlaHours() * 60L;

        return Math.min(100.0, Math.max(0, (effectiveMinutes * 100.0) / totalMinutes));
    }

    // =========================================================================
    // MINUTES RESTANTES
    // =========================================================================

    @Override
    public long calculateRemainingMinutes(Ticket ticket, BusinessHours bh) {
        if (ticket.getSlaHours() == null || ticket.getSlaHours() <= 0) return 0;

        long totalMinutes = ticket.getSlaHours() * 60L;
        long effectiveMinutes = calculateEffectiveElapsedMinutes(ticket, bh);

        return totalMinutes - effectiveMinutes;
    }

    // =========================================================================
    // PAUSE / REPRISE
    // =========================================================================

    @Override
    public void pauseSla(Ticket ticket) {
        if (ticket.getSlaPausedAt() != null) {
            log.debug("SLA already paused for ticket {}", ticket.getTicketNumber());
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        ticket.setSlaPausedAt(now);

        // Tracer dans la timeline
        recordTimelineEvent(ticket, "PAUSED", null, now.toString(),
                "SLA pausé (statut: " + ticket.getStatus().getLabel() + ")",
                ticket.getSlaPausedMinutes());

        log.info("SLA paused for ticket {} at {}", ticket.getTicketNumber(), now);
    }

    @Override
    public void resumeSla(Ticket ticket) {
        if (ticket.getSlaPausedAt() == null) {
            log.debug("SLA not paused for ticket {}", ticket.getTicketNumber());
            return;
        }

        LocalDateTime pausedAt = ticket.getSlaPausedAt();
        long pauseDuration = Duration.between(pausedAt, LocalDateTime.now()).toMinutes();
        long totalPaused = (ticket.getSlaPausedMinutes() != null ? ticket.getSlaPausedMinutes() : 0) + pauseDuration;

        ticket.setSlaPausedMinutes(totalPaused);
        ticket.setSlaPausedAt(null);

        // Recalculer la deadline : ajouter les minutes de pause
        if (ticket.getDeadline() != null) {
            LocalDateTime oldDeadline = ticket.getDeadline();
            LocalDateTime newDeadline = oldDeadline.plusMinutes(pauseDuration);
            ticket.setDeadline(newDeadline);

            recordTimelineEvent(ticket, "RESUMED",
                    oldDeadline.toString(), newDeadline.toString(),
                    "SLA repris après " + pauseDuration + " min de pause (total pausé: " + totalPaused + " min)",
                    totalPaused);
        } else {
            recordTimelineEvent(ticket, "RESUMED", null, null,
                    "SLA repris après " + pauseDuration + " min de pause",
                    totalPaused);
        }

        log.info("SLA resumed for ticket {} — paused {} min (total: {} min)",
                ticket.getTicketNumber(), pauseDuration, totalPaused);
    }

    // =========================================================================
    // INDICATEURS
    // =========================================================================

    @Override
    public boolean isAtRisk(Ticket ticket, BusinessHours bh) {
        double pct = calculateEffectivePercentage(ticket, bh);
        return pct >= 80 && pct < 100;
    }

    @Override
    public boolean isBreached(Ticket ticket, BusinessHours bh) {
        return calculateEffectivePercentage(ticket, bh) >= 100;
    }

    // =========================================================================
    // MÉTHODES PRIVÉES
    // =========================================================================

    /**
     * Calcule les minutes effectives écoulées (hors pauses, optionnellement en heures ouvrées).
     */
    private long calculateEffectiveElapsedMinutes(Ticket ticket, BusinessHours bh) {
        LocalDateTime start = ticket.getCreatedAt();
        LocalDateTime end = ticket.getResolvedAt() != null ? ticket.getResolvedAt() : LocalDateTime.now();

        long totalElapsed;
        if (bh != null) {
            totalElapsed = calculateBusinessMinutes(start, end, bh);
        } else {
            totalElapsed = Duration.between(start, end).toMinutes();
        }

        // Soustraire les pauses
        long pausedMins = ticket.getSlaPausedMinutes() != null ? ticket.getSlaPausedMinutes() : 0;
        if (ticket.getSlaPausedAt() != null) {
            pausedMins += Duration.between(ticket.getSlaPausedAt(), LocalDateTime.now()).toMinutes();
        }

        return Math.max(0, totalElapsed - pausedMins);
    }

    /**
     * Compte les minutes ouvrées entre deux dates.
     */
    private long calculateBusinessMinutes(LocalDateTime from, LocalDateTime to, BusinessHours bh) {
        Set<Integer> workDays = parseWorkDays(bh.getWorkDays());
        LocalTime dayStart = LocalTime.of(bh.getStartHour(), 0);
        LocalTime dayEnd = LocalTime.of(bh.getEndHour(), 0);

        long totalMinutes = 0;
        LocalDate currentDate = from.toLocalDate();
        LocalDate endDate = to.toLocalDate();

        while (!currentDate.isAfter(endDate)) {
            if (isWorkDay(currentDate, workDays)) {
                LocalTime periodStart = currentDate.equals(from.toLocalDate())
                        ? maxTime(from.toLocalTime(), dayStart)
                        : dayStart;
                LocalTime periodEnd = currentDate.equals(to.toLocalDate())
                        ? minTime(to.toLocalTime(), dayEnd)
                        : dayEnd;

                if (periodStart.isBefore(periodEnd)) {
                    totalMinutes += Duration.between(periodStart, periodEnd).toMinutes();
                }
            }
            currentDate = currentDate.plusDays(1);
        }

        return totalMinutes;
    }

    /**
     * Avance le curseur au prochain instant en horaires ouvrés.
     */
    private LocalDateTime advanceToBusinessTime(LocalDateTime dt, Set<Integer> workDays,
                                                  LocalTime dayStart, LocalTime dayEnd) {
        LocalDateTime cursor = dt;
        // Avancer tant qu'on n'est pas un jour ouvré dans le créneau
        for (int safety = 0; safety < 14; safety++) {
            if (isWorkDay(cursor.toLocalDate(), workDays)) {
                LocalTime t = cursor.toLocalTime();
                if (t.isBefore(dayStart)) {
                    return cursor.toLocalDate().atTime(dayStart);
                }
                if (t.isBefore(dayEnd)) {
                    return cursor;
                }
            }
            cursor = cursor.toLocalDate().plusDays(1).atTime(dayStart);
        }
        return cursor;
    }

    /** Parse "1,2,3,4,5" → Set<Integer> */
    private Set<Integer> parseWorkDays(String workDays) {
        return Arrays.stream(workDays.split(","))
                .map(String::trim)
                .map(Integer::parseInt)
                .collect(Collectors.toSet());
    }

    /** Vérifie si une date est un jour ouvré (1=Lundi..7=Dimanche) */
    private boolean isWorkDay(LocalDate date, Set<Integer> workDays) {
        int dow = date.getDayOfWeek().getValue(); // 1=Lundi…7=Dimanche
        return workDays.contains(dow);
    }

    private LocalTime maxTime(LocalTime a, LocalTime b) {
        return a.isAfter(b) ? a : b;
    }

    private LocalTime minTime(LocalTime a, LocalTime b) {
        return a.isBefore(b) ? a : b;
    }

    /**
     * Enregistre un événement dans la timeline SLA.
     */
    private void recordTimelineEvent(Ticket ticket, String eventType,
                                      String oldValue, String newValue,
                                      String details, Long pausedMinutes) {
        SlaTimeline event = SlaTimeline.builder()
                .ticket(ticket)
                .eventType(eventType)
                .oldValue(oldValue)
                .newValue(newValue)
                .details(details)
                .pausedMinutes(pausedMinutes)
                .build();
        slaTimelineRepository.save(event);
    }
}
