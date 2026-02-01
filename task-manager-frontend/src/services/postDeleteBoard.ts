import {API_ENDPOINTS} from "../common/constants";
import {DeleteBoardRequest} from "../common/commonTypes";

export async function postDeleteBoard(dto: DeleteBoardRequest) {
    const API_URL = process.env.REACT_APP_BACKEND_ORIGIN;
    const path = API_ENDPOINTS.deleteBoard;

    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(dto),
        credentials: 'include',
    });

    if (!response) {
        return null;
    }
    return response.status === 200;
}
