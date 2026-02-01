package com.kerrrusha.taskmanagerbackend.dto.board.response;

import java.util.List;

public record KanbanBoardsResponseDto(List<BoardResponseDto> boards) {
}
