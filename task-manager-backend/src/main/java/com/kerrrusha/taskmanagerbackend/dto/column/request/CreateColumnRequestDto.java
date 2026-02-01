package com.kerrrusha.taskmanagerbackend.dto.column.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateColumnRequestDto {
    @NotBlank
    private String boardId;

    @NotBlank
    private String title;

    private String background;
}
