import {useEffect, useState} from "react";
import {useAppDispatch} from "./useAppDispatch";
import {fetchKanban} from "../services/fetchKanban";
import {setKanban} from "../redux/slices/kanbanSlice";

export default function useFetchKanban() : [boolean] {
    const dispatch = useAppDispatch();
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        fetchKanban().then(kanban => {
            console.log(`Fetched kanban:`);
            console.log(kanban);

            dispatch(setKanban(kanban));
            setFetched(true);
        });
    }, []);

    return [fetched];
}
