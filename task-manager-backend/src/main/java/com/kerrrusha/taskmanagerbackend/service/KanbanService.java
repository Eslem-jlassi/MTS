package com.kerrrusha.taskmanagerbackend.service;

import com.kerrrusha.taskmanagerbackend.dto.board.request.CreateBoardRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.board.request.DeleteBoardRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.board.response.BoardResponseDto;
import com.kerrrusha.taskmanagerbackend.dto.column.request.CreateColumnRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.column.response.ColumnResponseDto;
import com.kerrrusha.taskmanagerbackend.dto.task.request.CreateTaskRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.task.request.DragTaskRequestDto;
import com.kerrrusha.taskmanagerbackend.dto.task.response.TaskResponseDto;

import java.util.List;

public interface KanbanService {

    List<BoardResponseDto> findAllBoards(String userId);

    void deleteBoard(DeleteBoardRequestDto boardRequestDto, String userId);

    BoardResponseDto saveBoard(CreateBoardRequestDto boardRequestDto);

    ColumnResponseDto addColumn(CreateColumnRequestDto columnRequestDto, String userId);

    TaskResponseDto addTask(CreateTaskRequestDto columnRequestDto, String userId);

    TaskResponseDto dragTask(DragTaskRequestDto taskRequestDto, String id);
}
