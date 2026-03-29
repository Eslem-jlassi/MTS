package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatbotResultDto {

    @JsonProperty("doc_type")
    private String docType;

    private String title;

    @JsonProperty("service_name")
    private String serviceName;

    private String language;
    private Double score;

    @JsonProperty("doc_id")
    private String docId;
}
