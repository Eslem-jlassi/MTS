package com.kerrrusha.taskmanagerbackend.dto.oauth;

import lombok.Data;

@Data
public class GoogleOAuthLoginRequestDto {
    private String idToken;
}
