import {API_ENDPOINTS} from "../common/constants";

export async function fetchKanban() {
    const API_URL = process.env.REACT_APP_BACKEND_ORIGIN;
    const path = API_ENDPOINTS.fetchKanban;

    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        credentials: 'include',
    });

    if (!response) {
        return null;
    }
    return response.status === 200 ? response.json() : null;
}
