import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import { AuthState, User } from "../../common/commonTypes";
import {RootState} from "../store";

const initialState: AuthState = {
    user: null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state: AuthState, action: PayloadAction<User>) => {
            state.user = action.payload;
        }
    },
});

export const { setUser } = authSlice.actions;

export const selectUser = (state: RootState) => state.auth.user;
