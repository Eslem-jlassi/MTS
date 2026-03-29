package com.billcom.mts.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class DuplicateDetectionRequestDto {

    @Valid
    @NotNull
    @JsonProperty("new_ticket")
    private NewTicketDto newTicket;

    @Valid
    @NotEmpty
    @JsonProperty("recent_tickets")
    private List<RecentTicketDto> recentTickets;

    @Data
    @NoArgsConstructor
    public static class NewTicketDto {

        @NotBlank
        private String title;

        private String description;
        private String service;

        @JsonProperty("client_id")
        private Long clientId;

        @JsonProperty("created_at")
        private String createdAt;
    }

    @Data
    @NoArgsConstructor
    public static class RecentTicketDto {

        @NotNull
        private Long id;

        @NotBlank
        private String title;

        private String description;
        private String service;
        private String status;

        @JsonProperty("created_at")
        private String createdAt;
    }
}
