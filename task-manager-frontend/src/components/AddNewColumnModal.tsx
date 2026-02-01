import {FormEvent, useState} from "react";
import {
    AddNewColumnRequest,
    AddNewColumnResponse,
    InputTarget,
} from "../common/commonTypes";
import {generateRandomMongoId, rgbToString} from "../common/commonUtils";
import {useAppDispatch} from "../hooks/useAppDispatch";
import {addNewColumn, addNewBoard} from "../redux/slices/kanbanSlice";
import { RgbColorPicker } from "react-colorful";
import {postNewBoard} from "../services/postNewBoard";
import {postNewColumn} from "../services/postNewColumn";

type AddNewColumnModalProps = {
    boardId: string,
};

export default function AddNewColumnModal({boardId} : AddNewColumnModalProps) {
    const [showModal, setShowModal] = useState(false);
    const dispatch = useAppDispatch();

    const[title, setTitle] = useState('');
    const[background, setBackground] = useState({ r: 200, g: 150, b: 35 });

    const handleAddNewColumnSubmit = (event : FormEvent) => {
        event.preventDefault();

        const requestBody : AddNewColumnRequest = {
            boardId: boardId,
            title: title,
            background: rgbToString(background),
        }

        postNewColumn(requestBody).then(savedColumn => {
            console.log("Saved column:");
            console.log(savedColumn);

            dispatch(addNewColumn({boardId, ...savedColumn}));
        });

        setShowModal(false);
    };

    return (
        <>
            <button
                className="border-dashed border-2 border-gray-600 button w-100 h-100 background-secondary text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                type="button"
                onClick={() => setShowModal(true)}
            >
                + Add new column
            </button>
            {showModal && (
                <>
                    <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none w-100">
                        <div className="relative my-6 mx-auto w-50">
                            {/*content*/}
                            <form method="POST" onSubmit={handleAddNewColumnSubmit}
                                  className="border-0 rounded-lg shadow-lg relative flex flex-col bg-white outline-none focus:outline-none">
                                {/*header*/}
                                <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                                    <h3 className="text-3xl font-semibold">
                                        Add new column
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
                                        <label htmlFor="title" className="block mb-2 text-sm font-medium">Title</label>
                                        <input type="text" id="title" value={title}
                                               className="text-black block border text-sm w-full p-2.5 focus:ring-1
                                               rounded-lg focus:ring-blue-500 focus:border-blue-500
                                               dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                               onChange={({target} : InputTarget) => setTitle(target.value)}
                                               required />
                                    </div>

                                    <div className="mb-3">
                                        <p className="block mb-2 text-sm font-medium">Background</p>
                                        <RgbColorPicker color={background} onChange={setBackground} />
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
