package com.billcom.mts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * MTS Telecom Supervision System - Main Application
 * 
 * Intelligent supervision and ticketing system for telecom operators.
 * Developed by Billcom Consulting (Tunisia) - Ericsson Integrator.
 * 
 * Final Year Project - 2026
 * 
 * Main features:
 * - Telecom incident ticket management (BSS/OSS)
 * - SLA tracking according to ITIL standards
 * - Immutable audit trail for legal compliance
 * - Integration with Ericsson systems (BSCS, CRM, etc.)
 * 
 * @author Billcom Consulting Team
 * @version 1.0.0
 */
@EnableScheduling
@EnableMethodSecurity
@SpringBootApplication
public class MtsTelecomApplication {

	public static void main(String[] args) {
		System.out.println("╔══════════════════════════════════════════════════════════════╗");
		System.out.println("║     MTS TELECOM SUPERVISION SYSTEM                           ║");
		System.out.println("║     Billcom Consulting - MTS System                ║");
		System.out.println("║     Version 1.0.0 - PFE 2026                                 ║");
		System.out.println("╚══════════════════════════════════════════════════════════════╝");
		
		SpringApplication.run(MtsTelecomApplication.class, args);
	}
}
