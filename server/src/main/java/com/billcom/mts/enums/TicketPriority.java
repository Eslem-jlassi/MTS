package com.billcom.mts.enums;

/**
 * Ticket priority levels with associated SLA hours.
 */
public enum TicketPriority {
    /**
     * Critical - 1 hour SLA
     * System down, major service impact
     */
    CRITICAL(1),
    
    /**
     * High - 4 hours SLA
     * Significant impact, degraded service
     */
    HIGH(4),
    
    /**
     * Medium - 24 hours SLA
     * Moderate impact, workaround available
     */
    MEDIUM(24),
    
    /**
     * Low - 72 hours SLA
     * Minor impact, enhancement request
     */
    LOW(72);

    private final int slaHours;

    TicketPriority(int slaHours) {
        this.slaHours = slaHours;
    }

    public int getSlaHours() {
        return slaHours;
    }
}
