import DarkModeSwitch from "../components/DarkModeSwitch";
import {useNavigate} from "react-router-dom";
import {useEffect} from "react";
import GoogleLogin from "../components/GoogleLogin";
import {PAGES} from "../common/constants";
import {LoggedInProps} from "../common/commonTypes";
import {onGoogleSignIn} from "../services/onGoogleSignIn";

export default function Login({loggedIn, setLoggedIn} : LoggedInProps) {
    const navigate = useNavigate();

    useEffect(() => {
        if (loggedIn) {
            navigate(PAGES.home);
        }
    }, [loggedIn]);

    return (
        <div className="background-primary">
            <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <img
                        className="mx-auto h-10 w-auto"
                        src="https://cdn-icons-png.flaticon.com/512/5065/5065589.png"
                        alt=""
                    />
                    <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight">
                        Sign in to your account
                    </h2>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                    <form className="space-y-6" action={`${process.env.REACT_APP_BACKEND_ORIGIN}/auth/login`} method="POST">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium leading-6">
                                Email address
                            </label>
                            <div className="mt-2">
                                <input
                                    required
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    className="text-black block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium leading-6">
                                    Password
                                </label>
                                <div className="text-sm">
                                    <button disabled className="font-semibold text-indigo-600 hover:text-indigo-500">
                                        Forgot password?
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2">
                                <input
                                    required
                                    minLength={3}
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    className="text-black block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Sign in
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin onGoogleSignIn={(cred) => onGoogleSignIn(cred, setLoggedIn)} text="Sign in with Google" />
                        </div>
                    </form>

                    <p className="mt-10 text-center text-sm text-gray-500">
                        Not registered yet?{' '}
                        <a href="/register" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
                            Sign Up
                        </a>
                    </p>
                </div>
            </div>
            <DarkModeSwitch />
        </div>
    );
}
