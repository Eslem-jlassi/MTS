import {API_ENDPOINTS} from "../common/constants";
import {AddNewTaskRequest} from "../common/commonTypes";

export async function postNewTask(requestBody: AddNewTaskRequest) {
    const API_URL = process.env.REACT_APP_BACKEND_ORIGIN;
    const path = API_ENDPOINTS.postNewTask;

    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(requestBody),
        credentials: 'include',
    });

    if (!response) {
        return null;
    }
    return response.status === 200 ? response.json() : null;
}
