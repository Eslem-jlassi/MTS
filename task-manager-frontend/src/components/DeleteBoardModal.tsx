import { useState } from "react";
import { DeleteBoardRequest } from "../common/commonTypes";
import { useAppDispatch } from "../hooks/useAppDispatch";
import {postDeleteBoard} from "../services/postDeleteBoard";
import {deleteBoardById} from "../redux/slices/kanbanSlice";

interface DeleteBoardModalProps {
    boardId: string;
}

export default function DeleteBoardModal({boardId} : DeleteBoardModalProps) {
    const [showModal, setShowModal] = useState(false);
    const dispatch = useAppDispatch();

    const handleDeleteBoard = () => {
        const requestBody : DeleteBoardRequest = {
            boardId: boardId
        }

        postDeleteBoard(requestBody).then(() => {
            console.log("Deleted board with id:");
            console.log(boardId);

            dispatch(deleteBoardById(requestBody));
        });

        setShowModal(false);
    };

    return (
        <>
            <button className="flex p-2 color-white"
                    type="button"
                    onClick={() => setShowModal(true)}>
                <span>×</span>
            </button>

            {showModal && (
                <>
                    <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none w-100">
                        <div className="relative my-6 mx-auto w-50">
                            {/*content*/}
                            <form method="POST" onSubmit={handleDeleteBoard}
                                  className="border-0 rounded-lg shadow-lg relative flex flex-col bg-white text-black outline-none focus:outline-none">
                                {/*header*/}
                                <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                                    <h3 className="text-3xl font-semibold">
                                        Are you sure?
                                    </h3>
                                    <button
                                        className="p-1 ml-auto bg-transparent border-0 text-black float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                                        onClick={() => setShowModal(false)} >
                                        ×
                                    </button>
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
                                        Delete board
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
