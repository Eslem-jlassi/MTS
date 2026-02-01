import {CredentialResponse} from "@react-oauth/google";
import {Dispatch} from "react";
import {postLoginToken} from "./postLoginToken";

// https://stackoverflow.com/questions/49819183/react-what-is-the-best-way-to-handle-login-and-authentication
export const onGoogleSignIn = async (res : CredentialResponse, setLoggedIn : Dispatch<any>) => {
    const { credential } = res;
    const loggedIn = await postLoginToken(credential!);   //non-null assertion
    setLoggedIn(loggedIn);
};
