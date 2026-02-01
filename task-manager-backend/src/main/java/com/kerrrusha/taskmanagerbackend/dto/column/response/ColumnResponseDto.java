package com.kerrrusha.taskmanagerbackend.dto.column.response;

import com.kerrrusha.taskmanagerbackend.dto.task.response.TaskResponseDto;
import lombok.Data;

@Data
public class ColumnResponseDto {
    private final String id;
    private final String createdAt;
    private final String createdByUserId;
    private final String boardId;
    private final String title;
    private final  String background;
    private TaskResponseDto[] tasks;
}
