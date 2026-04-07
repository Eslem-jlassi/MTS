package com.billcom.mts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * BusinessHours — Plage horaire ouvrable pour le calcul SLA.
 *
 * Le SLA peut être configuré en heures ouvrées (startHour–endHour, workDays)
 * au lieu de 24/7. Si aucune businessHours n'est liée à un SlaConfig,
 * le calcul s'effectue en mode calendaire (24/7).
 *
 * workDays: chaîne séparée par des virgules, 1=Lundi … 7=Dimanche.
 */
@Entity
@Table(name = "business_hours")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BusinessHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nom descriptif (ex: "Standard Billcom", "Horaires 24/7") */
    @Column(nullable = false, length = 100)
    private String name;

    /** Heure de début (0-23) */
    @Column(name = "start_hour", nullable = false, columnDefinition = "tinyint")
    private Integer startHour;

    /** Heure de fin (0-23) */
    @Column(name = "end_hour", nullable = false, columnDefinition = "tinyint")
    private Integer endHour;

    /** Jours ouvrés séparés par virgule: "1,2,3,4,5" = Lun-Ven */
    @Column(name = "work_days", nullable = false, length = 30)
    private String workDays;

    /** Fuseau horaire (IANA) */
    @Column(nullable = false, length = 50)
    @Builder.Default
    private String timezone = "Europe/Paris";

    /** Horaire par défaut utilisé si aucun n'est spécifié */
    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean isDefault = false;

    /** Actif / inactif */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // === Helpers ===

    /**
     * Retourne le nombre d'heures ouvrables par jour.
     */
    public int hoursPerDay() {
        return endHour - startHour;
    }

    /**
     * Retourne les jours ouvrés sous forme de tableau d'entiers.
     */
    public int[] getWorkDaysArray() {
        String[] parts = workDays.split(",");
        int[] days = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            days[i] = Integer.parseInt(parts[i].trim());
        }
        return days;
    }
}
