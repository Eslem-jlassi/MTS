package com.billcom.mts.dto.quickreply;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for quick reply template.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickReplyTemplateResponse {

    private Long id;
    private String name;
    private String content;
    private String category;
    /** Parsed variable list, e.g. ["{client}", "{ticketId}"] */
    private List<String> variables;
    private String roleAllowed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
