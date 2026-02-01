import {configureStore} from "@reduxjs/toolkit";
import {kanbanSlice} from "./slices/kanbanSlice";
import {authSlice} from "./slices/authSlice";

const store = configureStore({
   reducer: {
       kanban: kanbanSlice.reducer,
       auth: authSlice.reducer,
   }
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
