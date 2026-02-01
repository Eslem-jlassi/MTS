import {API_ENDPOINTS} from "../common/constants";

export const isLoggedIn = async () => {
    const API_URL = process.env.REACT_APP_BACKEND_ORIGIN;
    const path = API_ENDPOINTS.isAuthorized;

    const response = await fetch(`${API_URL}${path}`, {
        credentials: 'include',
    });

    if (!response) {
        return false;
    }
    return response.status === 200;
};
