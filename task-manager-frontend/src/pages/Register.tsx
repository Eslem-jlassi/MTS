import React, {useEffect} from 'react';
import DarkModeSwitch from "../components/DarkModeSwitch";
import {LoggedInProps} from "../common/commonTypes";
import GoogleLogin from "../components/GoogleLogin";
import {onGoogleSignIn} from "../services/onGoogleSignIn";
import {useNavigate} from "react-router-dom";
import {PAGES} from "../common/constants";

export default function Register({loggedIn, setLoggedIn} : LoggedInProps) {
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
                        Create account
                    </h2>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                    <form className="space-y-6" action={`${process.env.REACT_APP_BACKEND_ORIGIN}/auth/register`} method="POST">
                        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label htmlFor="first-name" className="block text-sm font-medium leading-6">
                                    First Name
                                </label>
                                <input
                                    required
                                    minLength={3}
                                    type="text"
                                    name="first-name"
                                    id="first-name"
                                    className="mt-2 text-black block mr-2 w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="last-name" className="block text-sm font-medium leading-6">
                                    Last Name
                                </label>
                                <input
                                    required
                                    minLength={3}
                                    type="text"
                                    name="last-name"
                                    id="last-name"
                                    className="mt-2 text-black block mr-2 w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium leading-6">
                                Email address
                            </label>
                            <div className="mt-2">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="text-black block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium leading-6">
                                Password
                            </label>
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
                            <label htmlFor="password" className="mt-2 block text-sm font-medium leading-6">
                                Repeat password
                            </label>
                            <div className="mt-2">
                                <input
                                    required
                                    minLength={3}
                                    id="password-repeat"
                                    name="password-repeat"
                                    type="password"
                                    autoComplete="password-repeat"
                                    className="text-black block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Sign up
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin onGoogleSignIn={(cred) => onGoogleSignIn(cred, setLoggedIn)} text="Sign up with Google" />
                        </div>
                    </form>

                    <p className="mt-10 text-center text-sm text-gray-500">
                        Already registered?{' '}
                        <a href="/login" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
                            Sign In
                        </a>
                    </p>
                </div>
            </div>
            <DarkModeSwitch />
        </div>
    );
}