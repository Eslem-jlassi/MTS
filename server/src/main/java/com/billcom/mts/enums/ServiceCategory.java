package com.billcom.mts.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Service categories for telecom services in MTS.
 */
@Getter
@RequiredArgsConstructor
public enum ServiceCategory {
    /**
     * Billing systems (BSCS, Rating, Invoicing)
     */
    BILLING("Billing"),
    
    /**
     * Customer Relationship Management
     */
    CRM("CRM"),
    
    /**
     * Network systems (Core, RAN, Transport)
     */
    NETWORK("Network"),
    
    /**
     * IT Infrastructure (Servers, Storage, Cloud)
     */
    INFRA("Infrastructure"),
    
    /**
     * Other systems
     */
    OTHER("Other");

    private final String label;
}
