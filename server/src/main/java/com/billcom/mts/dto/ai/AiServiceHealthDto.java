package com.billcom.mts.dto.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiServiceHealthDto {

    private boolean available;
    private String status;
    private String service;
    private String version;

    @JsonProperty("model_loaded")
    private Boolean modelLoaded;

    private String mode;

    @JsonProperty("documents_indexed")
    private Integer documentsIndexed;

    @JsonProperty("model_name")
    private String modelName;

    private String message;

    public static AiServiceHealthDto unavailable(String service, String message) {
        return AiServiceHealthDto.builder()
                .available(false)
                .status("unavailable")
                .service(service)
                .message(message)
                .build();
    }
}
