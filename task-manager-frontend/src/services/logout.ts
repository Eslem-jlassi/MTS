import {API_ENDPOINTS} from "../common/constants";

export const logout = async () => {
    const API_URL = process.env.REACT_APP_BACKEND_ORIGIN;
    const path = API_ENDPOINTS.logout;

    await fetch(`${API_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
    });
};
