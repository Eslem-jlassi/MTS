package com.kerrrusha.taskmanagerbackend.dto.board.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateBoardRequestDto {
    @NotBlank
    private String title;
}
