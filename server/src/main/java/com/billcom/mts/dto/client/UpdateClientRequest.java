package com.billcom.mts.dto.client;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateClientRequest {
    @Size(max = 100)
    private String companyName;
    private String address;
}
