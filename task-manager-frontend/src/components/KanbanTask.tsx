import PropTypes from "prop-types";
import {Task} from "../common/commonTypes";
import React from "react";

interface KanbanTaskProps {
    task: Task,
    columnId: string,
}

function KanbanTask({task, columnId} : KanbanTaskProps) {
    const handleOnDrag = (e : React.DragEvent) => {
        e.dataTransfer.setData(
            "text",
            JSON.stringify({ taskId: task.id, prevColId: columnId })
        );
    };

    return (
        <div>
            <div draggable="true"
                 onDragStart={handleOnDrag}
                 className="background-secondary w-[280px] first:my-5 rounded-lg shadow-[#364e7e1a] pt-6 pb-2 px-3
                 shadow-lg hover:text-[#635fc7] cursor-pointer "
            >
                <p className="font-bold tracking-wide ">
                    {task.title}
                </p>
                <p className="text-s tracking-tighter mt-2 text-gray-500">
                    {task.description}
                </p>
                <div>
                    <p className="font-bold text-xs tracking-tighter mt-2 text-gray-500">
                        Assigned to: <span>{task.assignedTo}</span>
                    </p>
                    <p className="font-bold text-xs tracking-tighter mt-2 text-gray-500">
                        Priority: <span>{task.priority}</span>
                    </p>
                    <p className="font-bold text-xs tracking-tighter mt-2 text-gray-500">
                        Due date: <span>{task.dueDate}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

KanbanTask.propTypes = {
    data: PropTypes.shape({
        "id": PropTypes.string.isRequired,
        "title": PropTypes.string.isRequired,
        "description": PropTypes.string.isRequired,
        "assignedTo": PropTypes.string.isRequired,
        "priority": PropTypes.string.isRequired,
        "dueDate": PropTypes.string.isRequired,
    })
};

export default KanbanTask;
