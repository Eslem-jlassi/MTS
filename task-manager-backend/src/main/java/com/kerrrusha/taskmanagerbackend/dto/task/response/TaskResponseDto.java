package com.kerrrusha.taskmanagerbackend.dto.task.response;

public record TaskResponseDto (
        String id,
        String createdAt,
        String createdByUserId,
        String columnId,
        String title,
        String description,
        String assignedTo,
        String priority,
        String dueDate
) {}
