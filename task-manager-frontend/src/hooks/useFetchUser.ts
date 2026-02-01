import {useEffect, useState} from "react";
import {fetchUserInfo} from "../services/fetchUserInfo";
import {setUser} from "../redux/slices/authSlice";
import {useAppDispatch} from "./useAppDispatch";

export default function useFetchUser() : [boolean] {
    const dispatch = useAppDispatch();
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        fetchUserInfo().then(user => {
            console.log(`Fetched user:`);
            console.log(user);

            dispatch(setUser(user));
            setFetched(true);
        });
    }, []);

    return [fetched];
}
