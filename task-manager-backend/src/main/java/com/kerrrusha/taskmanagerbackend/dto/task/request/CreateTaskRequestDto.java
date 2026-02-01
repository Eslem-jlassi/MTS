package com.kerrrusha.taskmanagerbackend.dto.task.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTaskRequestDto {
    @NotBlank
    private String columnId;

    @NotBlank
    private String title;

    private String description;

    @NotBlank
    private String assignedTo;

    @NotBlank
    private String priority;

    @NotBlank
    private String dueDate;
}
