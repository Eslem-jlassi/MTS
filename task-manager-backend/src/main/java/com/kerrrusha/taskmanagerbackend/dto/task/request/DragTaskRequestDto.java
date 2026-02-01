package com.kerrrusha.taskmanagerbackend.dto.task.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DragTaskRequestDto {

    private String boardId;

    @NotBlank
    private String targetColumnId;

    @NotBlank
    private String prevColumnId;

    @NotBlank
    private String taskId;
}
