package com.kerrrusha.taskmanagerbackend.mapper;

import com.kerrrusha.taskmanagerbackend.config.MapperConfig;
import com.kerrrusha.taskmanagerbackend.domain.Column;
import com.kerrrusha.taskmanagerbackend.dto.column.request.CreateColumnRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.column.response.ColumnResponseDto;
import com.kerrrusha.taskmanagerbackend.dto.task.response.TaskResponseDto;
import com.kerrrusha.taskmanagerbackend.repository.TaskRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(config = MapperConfig.class)
public abstract class ColumnMapper {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskMapper taskMapper;

    public abstract Column toEntity(CreateColumnRequestDto columnRequestDto);

    @Mapping(target = "tasks", ignore = true)
    public abstract ColumnResponseDto toDto(Column column);

    @AfterMapping
    protected void setTasks(@MappingTarget ColumnResponseDto columnResponseDto, Column column) {
        TaskResponseDto[] tasks = taskRepository.findAllByColumnId(column.getId())
                .stream()
                .map(taskMapper::toDto)
                .toArray(TaskResponseDto[]::new);
        columnResponseDto.setTasks(tasks);
    }
}
