package com.kerrrusha.taskmanagerbackend.mapper;

import com.kerrrusha.taskmanagerbackend.config.MapperConfig;
import com.kerrrusha.taskmanagerbackend.domain.Task;
import com.kerrrusha.taskmanagerbackend.dto.task.request.CreateTaskRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.task.response.TaskResponseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Named;

@Mapper(config = MapperConfig.class)
public interface TaskMapper {

    Task toEntity(CreateTaskRequestDto taskRequestDto);

    @Named(value = "toDto")
    TaskResponseDto toDto(Task task);

    default Task.Priority mapPriority(String priority) {
        return Task.Priority.valueOf(priority.toUpperCase());
    }
}
