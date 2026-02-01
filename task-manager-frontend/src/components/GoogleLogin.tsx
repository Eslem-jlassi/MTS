import { useRef } from 'react';
import useScript from '../hooks/useScript';
import {CredentialResponse} from "@react-oauth/google";

interface GoogleLoginProps {
    onGoogleSignIn: (res: CredentialResponse) => Promise<any>;
    text: string;
}

// https://github.com/anthonyjgrove/react-google-login/issues/502
// https://developers.google.com/identity/gsi/web/reference/js-reference#CredentialResponse
export default function GoogleLogin({
    onGoogleSignIn,
    text = 'signin_with',
} : GoogleLoginProps) {
    const googleSignInButton = useRef(null);

    useScript('https://accounts.google.com/gsi/client', () => {
        // https://developers.google.com/identity/gsi/web/reference/js-reference#google.accounts.id.initialize
        // @ts-ignore
        window.google.accounts.id.initialize({
            client_id: process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID,
            callback: onGoogleSignIn,
        });
        // https://developers.google.com/identity/gsi/web/reference/js-reference#google.accounts.id.renderButton
        // @ts-ignore
        window.google.accounts.id.renderButton(
            googleSignInButton.current,
            { theme: 'outline', size: 'medium', text, width: '250' }, // customization attributes
        );
    });

    return <div ref={googleSignInButton}></div>;
}
