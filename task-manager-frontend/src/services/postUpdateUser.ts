import {API_ENDPOINTS} from "../common/constants";
import {UserUpdateRequest} from "../common/commonTypes";

export async function postUpdateUser(requestBody: UserUpdateRequest) {
    const API_URL = process.env.REACT_APP_BACKEND_ORIGIN;
    const path = API_ENDPOINTS.postUpdateUser;

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
