import {FormEvent, useState} from "react";
import {
    AddNewTaskRequest,
    Column,
    InputTarget,
    SelectTarget,
    TextAreaTarget
} from "../common/commonTypes";
import {useAppDispatch} from "../hooks/useAppDispatch";
import {addNewTask} from "../redux/slices/kanbanSlice";
import {postNewTask} from "../services/postNewTask";

type AddNewTaskModalProps = {
    columns: Array<Column>,
    boardId: string,
};

export default function AddNewTaskModal({columns, boardId} : AddNewTaskModalProps) {
    const [showModal, setShowModal] = useState(false);
    const dispatch = useAppDispatch();
    const active = columns && columns.length > 0;

    const[columnId, setColumnId] = useState('');
    const[title, setTitle] = useState('');
    const[description, setDescription] = useState('');
    const[assignedTo, setAssignedTo] = useState('');
    const[priority, setPriority] = useState('');
    const[dueDate, setDueDate] = useState('');

    const handleAddNewTaskSubmit = (event : FormEvent) => {
        event.preventDefault();

        const requestBody : AddNewTaskRequest = {
            boardId: boardId,
            columnId: columnId,
            title: title,
            description: description,
            assignedTo: assignedTo,
            priority: priority,
            dueDate: dueDate,
        }

        postNewTask(requestBody).then(savedTask => {
            console.log("Saved task:");
            console.log(savedTask);

            dispatch(addNewTask({boardId, columnId, ...savedTask}));
        });

        setShowModal(false);
    };

    return (
        <>
            <button
                className="button background-action disabled:bg-gray-500 text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 ease-linear transition-all duration-150"
                type="button"
                onClick={() => setShowModal(true)}
                disabled={!active}
                title={active ? "" : "Board should have at least 1 column to create new task"}
            >
                + Add new task
            </button>
            {showModal && (
                <>
                    <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none w-100">
                        <div className="relative my-6 mx-auto w-50">
                            {/*content*/}
                            <form method="POST" onSubmit={handleAddNewTaskSubmit}
                                  className="border-0 rounded-lg shadow-lg relative flex flex-col bg-white outline-none focus:outline-none">
                                {/*header*/}
                                <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                                    <h3 className="text-3xl font-semibold">
                                        Add new task
                                    </h3>
                                    <button
                                        className="p-1 ml-auto bg-transparent border-0 text-black float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                                        onClick={() => setShowModal(false)} >
                                        ×
                                    </button>
                                </div>
                                {/*body*/}
                                <div className="relative p-6 flex-auto">
                                    <div className="mb-3">
                                        <label htmlFor="column"
                                               className="block mb-2 text-sm font-medium">Column</label>
                                        <select id="column"
                                                value={columnId}
                                                required
                                                onChange={({target} : SelectTarget) => setColumnId(target.value)}
                                                className="text-black border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                            <option value="">Choose column</option>
                                            {columns.map((col, index) => <option key={index} value={col.id}>{col.title}</option>)}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="title" className="block mb-2 text-sm font-medium">Title</label>
                                        <input type="text" id="title" value={title}
                                               className="text-black block border text-sm w-full p-2.5 focus:ring-1
                                               rounded-lg focus:ring-blue-500 focus:border-blue-500
                                               dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                               onChange={({target} : InputTarget) => setTitle(target.value)}
                                               required />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="description"
                                               className="block mb-2 text-sm font-medium">Description</label>
                                        <textarea id="description" value={description}
                                               className="text-black block border p-2.5 w-full text-sm
                                               rounded-lg focus:ring-blue-500 focus:border-blue-500
                                               dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                               onChange={({target} : TextAreaTarget) => setDescription(target.value)}
                                               required />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="assigned-to" className="block mb-2 text-sm font-medium">Assigned to</label>
                                        <input type="text" id="assigned-to" value={assignedTo}
                                               className="text-black block border text-sm w-full p-2.5 focus:ring-1
                                               rounded-lg focus:ring-blue-500 focus:border-blue-500
                                               dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                               onChange={({target} : InputTarget) => setAssignedTo(target.value)}
                                               required />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="priority"
                                               className="block mb-2 text-sm font-medium">Priority</label>
                                        <select id="priority"
                                                value={priority}
                                                required
                                                onChange={({target} : SelectTarget) => setPriority(target.value)}
                                                className="text-black border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                            <option value="">Choose priority</option>
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="mb-5">
                                        <label htmlFor="due-date"
                                               className="block mb-2 text-sm font-medium">Due date</label>
                                        <input type="date" id="due-date" value={dueDate}
                                               onChange={({target} : InputTarget) => setDueDate(target.value)} required />
                                    </div>


                                </div>
                                {/*footer*/}
                                <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">
                                    <button
                                        className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Close
                                    </button>
                                    <button
                                        className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                                        type="submit"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
                </>
            )}
        </>
    );
}
