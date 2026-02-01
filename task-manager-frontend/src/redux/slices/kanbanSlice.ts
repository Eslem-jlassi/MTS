import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    AddNewBoardResponse,
    AddNewColumnResponse,
    AddNewTaskResponse,
    Column, DeleteBoardRequest, DragTaskRequest, KanbanBoardsResponse,
    KanbanState,
    Task
} from "../../common/commonTypes";
import {mapAddNewTaskResponseToTask} from "../../common/commonUtils";
import assert from "assert";
import {RootState} from "../store";

const initialState: KanbanState = {
    activeBoardId: "",
    boards: []
};

function getActiveBoardId(stateCopy : KanbanState) {
    const boards = stateCopy.boards;
    if (!boards || boards.length === 0) {
        console.warn("Can't choose active board");
        return "";
    }
    if (!stateCopy.activeBoardId || stateCopy.activeBoardId.length === 0) {
        return boards[0].id;
    }
    const activeBoard = findBoardById(stateCopy, stateCopy.activeBoardId);
    return activeBoard !== undefined ? stateCopy.activeBoardId : boards[0].id;
}

export const kanbanSlice = createSlice({
    name: 'kanban',
    initialState,
    reducers: {
        setKanban: (state, action: PayloadAction<any>) => {
            const dto: KanbanBoardsResponse = action.payload;

            state.boards = dto.boards;
            state.activeBoardId = getActiveBoardId({ ...state });
        },
        addNewTask: (state, action: PayloadAction<AddNewTaskResponse>) => {
            const dto: AddNewTaskResponse = action.payload;
            const task: Task = mapAddNewTaskResponseToTask(dto);

            const boardIndex = state.boards.findIndex(board => board.id === dto.boardId);
            const columnIndex = state.boards[boardIndex].columns.findIndex(column => column.id === dto.columnId);

            state.boards[boardIndex].columns[columnIndex].tasks.push(task);
        },
        addNewColumn: (state, action: PayloadAction<AddNewColumnResponse>) => {
            const dto: AddNewColumnResponse = action.payload;
            const column: Column = dto;

            const boardIndex = state.boards.findIndex(board => board.id === dto.boardId);

            state.boards[boardIndex].columns.push(column);
        },
        addNewBoard: (state, action: PayloadAction<AddNewBoardResponse>) => {
            const savedBoard: AddNewBoardResponse = action.payload;
            state.boards.push(savedBoard);
            state.activeBoardId = getActiveBoardId({ ...state });
        },
        deleteBoardById: (state, action: PayloadAction<DeleteBoardRequest>) => {
            const deleteBoardDto: DeleteBoardRequest = action.payload;

            const deletedBoardIndex = state.boards.findIndex(board => board.id === deleteBoardDto.boardId);
            state.boards.splice(deletedBoardIndex, 1);
            state.activeBoardId = getActiveBoardId({ ...state });
        },
        setActiveBoardId: (state, action: PayloadAction<string>) => {
            state.activeBoardId = action.payload;
        },
        dragTask: (state, action: PayloadAction<DragTaskRequest>) => {
            const dto: DragTaskRequest = action.payload;

            const board = state.boards.find((board) => board.id === dto.boardId);
            assert(board !== undefined, `Can't find such board with id=${dto.boardId}`);

            const prevCol = board.columns.find(col => col.id === dto.prevColumnId);
            assert(prevCol !== undefined, `Can't find such previous column with id=${dto.prevColumnId}`);

            const taskIndex = prevCol.tasks.findIndex(task => task.id === dto.taskId);
            const task = prevCol.tasks[taskIndex];
            prevCol.tasks.splice(taskIndex, 1);

            const targetCol = board.columns.find(col => col.id === dto.targetColumnId);
            assert(targetCol !== undefined, `Can't find such target column with id=${dto.targetColumnId}`);

            targetCol.tasks.push(task);
        },
    },
});

export const { addNewTask, addNewColumn, setActiveBoardId, addNewBoard, dragTask, setKanban, deleteBoardById } = kanbanSlice.actions;

export const selectActiveBoardId = (state: RootState) => state.kanban.activeBoardId;

export const selectActiveBoard = (state: RootState) => findBoardById(state.kanban, selectActiveBoardId(state));

const findBoardById = (state: KanbanState, id: string) =>
    state.boards.filter(board => board.id === id)[0];
