import {Board} from "../common/commonTypes";
import {useAppDispatch} from "../hooks/useAppDispatch";
import {selectActiveBoardId, setActiveBoardId} from "../redux/slices/kanbanSlice";
import {useAppSelector} from "../hooks/useAppSelector";
import DeleteBoardModal from "./DeleteBoardModal";

interface SidebarButtonProps {
    board: Board;
}

export default function SidebarButton({board} : SidebarButtonProps) {
    const activeBoardId = useAppSelector(selectActiveBoardId);
    const dispatch = useAppDispatch();

    const isActive = board.id === activeBoardId;

    return (
        <a className={`${isActive ? "active" : ""} sidebar-button text-decoration-none cursor-pointer`} onClick={() => dispatch(setActiveBoardId(board.id))}>
            <div className="flex">
                <img src="https://kanban-task-management-react-tailwind.vercel.app/static/media/icon-board.29b48f5174742b4dd3a04f52d710293c.svg"
                     alt=""/>
            </div>
            <div className="flex flex-1 justify-center">
                <p className="font-bold fs-5">{board.title}</p>
            </div>
            <DeleteBoardModal boardId={board.id} />
        </a>
    );
}
