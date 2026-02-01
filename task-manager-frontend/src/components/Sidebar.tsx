import SidebarButton from "./SidebarButton";
import React from "react";
import {useAppSelector} from "../hooks/useAppSelector";
import {Board} from "../common/commonTypes";
import AddNewBoardModal from "./AddNewBoardModal";

export default function Sidebar() {
    const boards: Array<Board> = useAppSelector((state) => state.kanban.boards);

    return (
        <div className="w-[230px] flex flex-column background-secondary sticky">
            <p className="fs-5 font-bold mb-4 mx-3 mt-3">ALL BOARDS (<span id="boards-count">{boards.length}</span>)</p>
            {boards.map((board, index) => <SidebarButton board={board} key={index} />)}
            <AddNewBoardModal />
        </div>
    );
}
