package com.billcom.mts.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Types de services télécom gérés par Billcom Consulting.
 * Basés sur le portfolio de solutions Ericsson déployées chez les opérateurs tunisiens.
 * 
 * Chaque service correspond à un système critique chez les opérateurs:
 * - Orange Tunisie
 * - Ooredoo Tunisie
 * - Tunisie Telecom
 */
@Getter
@RequiredArgsConstructor
public enum ServiceType {
    
    // === Systèmes BSS (Business Support Systems) ===
    BSCS_BILLING("Facturation BSCS", "billing", "#ef4444", "bss",
            "Système de facturation et rating Ericsson BSCS"),
    
    ERICSSON_CRM("CRM Ericsson", "crm", "#f97316", "bss",
            "Gestion de la relation client et portail abonné"),
    
    CHARGING_SYSTEM("Système de Charging", "charging", "#eab308", "bss",
            "Prépayé et contrôle de crédit en temps réel"),
    
    MEDIATION("Médiation CDR", "mediation", "#84cc16", "bss",
            "Collecte et traitement des CDR (Call Detail Records)"),
    
    // === Systèmes OSS (Operations Support Systems) ===
    NETWORK_4G("Réseau 4G/5G", "network", "#22c55e", "oss",
            "Infrastructure radio et stations de base"),
    
    CORE_NETWORK("Cœur de réseau", "core", "#14b8a6", "oss",
            "IMS, EPC, signalisation SS7/Diameter"),
    
    TRANSPORT("Transport IP/MPLS", "transport", "#06b6d4", "oss",
            "Backbone et liaisons inter-sites"),
    
    // === Infrastructure ===
    INFRASTRUCTURE("Infrastructure IT", "infra", "#3b82f6", "infra",
            "Serveurs, stockage, virtualisation VMware"),
    
    DATABASE("Bases de données", "database", "#6366f1", "infra",
            "Oracle, PostgreSQL, MongoDB pour BSS/OSS"),
    
    SECURITY("Sécurité", "security", "#8b5cf6", "infra",
            "Firewalls, IDS/IPS, gestion des accès"),
    
    // === Services transverses ===
    INTEGRATION("Intégration API", "integration", "#a855f7", "transverse",
            "ESB, API Gateway, interconnexions partenaires"),
    
    REPORTING("BI & Reporting", "reporting", "#d946ef", "transverse",
            "Tableaux de bord, analytics, rapports réglementaires");

    private final String displayName;
    private final String iconCode;        // Clé pour icône React (ex: Lucide icons)
    private final String colorHex;        // Couleur associée au service
    private final String category;        // Catégorie: bss, oss, infra, transverse
    private final String description;     // Description pour tooltip/aide contextuelle

    /**
     * Retourne tous les services d'une catégorie donnée.
     */
    public static ServiceType[] getByCategory(String category) {
        return java.util.Arrays.stream(values())
                .filter(s -> s.category.equals(category))
                .toArray(ServiceType[]::new);
    }

    /**
     * Vérifie si ce service est critique pour les revenus de l'opérateur.
     * Les services BSS sont considérés comme critiques car liés à la facturation.
     */
    public boolean isRevenueCritical() {
        return this.category.equals("bss");
    }
}
