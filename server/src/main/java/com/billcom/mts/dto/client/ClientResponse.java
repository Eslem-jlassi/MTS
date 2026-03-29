package com.billcom.mts.dto.client;

import com.billcom.mts.entity.Client;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ClientResponse {
    private Long id;
    private String clientCode;
    private String companyName;
    private String address;
    private Long userId;
    private String userEmail;
    private String userFullName;
    private String userPhone;
    private Boolean userEmailVerified;
    private boolean isActive;
    private long ticketCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClientResponse from(Client client, long ticketCount) {
        return ClientResponse.builder()
                .id(client.getId())
                .clientCode(client.getClientCode())
                .companyName(client.getCompanyName())
                .address(client.getAddress())
                .userId(client.getUser().getId())
                .userEmail(client.getUser().getEmail())
                .userFullName(client.getUser().getFullName())
                .userPhone(client.getUser().getPhone())
                .userEmailVerified(client.getUser().getEmailVerified())
                .isActive(Boolean.TRUE.equals(client.getUser().getIsActive()))
                .ticketCount(ticketCount)
                .createdAt(client.getCreatedAt())
                .updatedAt(client.getUpdatedAt())
                .build();
    }
}
