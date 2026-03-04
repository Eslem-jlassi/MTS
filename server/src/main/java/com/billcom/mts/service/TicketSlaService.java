package com.billcom.mts.service;

import com.billcom.mts.dto.ticket.TicketResponse;
import com.billcom.mts.entity.Ticket;

import java.util.List;

/**
 * ============================================================================
 * TicketSlaService - Service for SLA (Service Level Agreement) Management
 * ============================================================================
 * 
 * REFACTORING FIX: Extracted from TicketServiceImpl to separate concerns
 * 
 * RESPONSIBILITIES:
 * - Monitor SLA compliance for all active tickets
 * - Detect SLA breaches (deadline exceeded)
 * - Detect tickets approaching SLA deadline
 * - Calculate SLA deadlines based on priority
 * - Send SLA warning notifications
 * - Execute scheduled SLA monitoring tasks
 * 
 * SLA RULES BY PRIORITY:
 * - CRITICAL: 4 hours
 * - HIGH: 8 hours
 * - MEDIUM: 24 hours
 * - LOW: 72 hours
 * 
 * SCHEDULED TASKS:
 * - detectSlaBreaches(): Runs every 5 minutes to mark breached tickets
 * - detectSlaAtRisk(): Runs every 15 minutes to warn about approaching deadlines
 * 
 * ============================================================================
 */
public interface TicketSlaService {

    /**
     * Get all tickets that have breached their SLA.
     * 
     * @return List of tickets with deadline exceeded
     */
    List<TicketResponse> getSlaBreachedTickets();

    /**
     * Get tickets approaching their SLA deadline.
     * 
     * @param hoursBeforeDeadline Warning threshold in hours (e.g., 2 hours before deadline)
     * @return List of tickets nearing their deadline
     */
    List<TicketResponse> getTicketsApproachingSla(int hoursBeforeDeadline);

    /**
     * Calculate SLA deadline for a ticket based on priority and creation time.
     * 
     * @param ticket The ticket to calculate deadline for
     * @return Calculated deadline timestamp
     */
    java.time.LocalDateTime calculateSlaDeadline(Ticket ticket);

    /**
     * Scheduled task: Detect and mark SLA breached tickets.
     * Runs every 5 minutes.
     * 
     * This method:
     * 1. Finds all active tickets past their deadline
     * 2. Marks them as breachedSla = true
     * 3. Sends SLA breach notifications
     * 4. Logs the breach for audit
     * 
     * ERROR HANDLING: Wrapped in try-catch to prevent scheduler from stopping
     */
    void detectSlaBreaches();

    /**
     * Scheduled task: Detect tickets at risk of SLA breach.
     * Runs every 15 minutes.
     * 
     * This method:
     * 1. Finds tickets approaching deadline (within warning threshold)
     * 2. Sends warning notifications to assigned agents
     * 3. Logs warnings for monitoring dashboard
     * 
     * ERROR HANDLING: Wrapped in try-catch to prevent scheduler from stopping
     */
    void detectSlaAtRisk();
}
