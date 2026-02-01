package com.kerrrusha.taskmanagerbackend.mapper;

import com.kerrrusha.taskmanagerbackend.config.MapperConfig;
import com.kerrrusha.taskmanagerbackend.domain.Board;
import com.kerrrusha.taskmanagerbackend.dto.board.request.CreateBoardRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.board.response.BoardResponseDto;
import com.kerrrusha.taskmanagerbackend.dto.column.response.ColumnResponseDto;
import com.kerrrusha.taskmanagerbackend.repository.ColumnRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(config = MapperConfig.class)
public abstract class BoardMapper {

    @Autowired
    private ColumnRepository columnRepository;

    @Autowired
    private ColumnMapper columnMapper;

    public abstract Board toEntity(CreateBoardRequestDto boardRequestDto);

    @Mapping(target = "columns", ignore = true)
    public abstract BoardResponseDto toDto(Board board);

    @AfterMapping
    protected void setColumns(@MappingTarget BoardResponseDto boardResponseDto, Board board) {
        List<ColumnResponseDto> columns = columnRepository.findAllByBoardId(board.getId())
                .stream()
                .map(columnMapper::toDto)
                .toList();
        boardResponseDto.setColumns(columns);
    }
}
