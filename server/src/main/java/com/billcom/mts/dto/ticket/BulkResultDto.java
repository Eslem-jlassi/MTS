package com.billcom.mts.dto.ticket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** Résultat d'une action en masse (succès + erreurs par ticket). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkResultDto {

    private int successCount;
    private int errorCount;
    @Builder.Default
    private List<String> errors = new ArrayList<>();

    public static BulkResultDto success(int count) {
        return BulkResultDto.builder().successCount(count).errorCount(0).build();
    }
}
