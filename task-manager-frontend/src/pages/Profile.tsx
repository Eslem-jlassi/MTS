import Header from '../components/Header';
import SaveableInput from "../components/SaveableInput";
import {LoggedInProps, User, UserUpdateRequest} from "../common/commonTypes";
import useFetchUser from "../hooks/useFetchUser";
import {useAppSelector} from "../hooks/useAppSelector";
import {selectUser, setUser} from "../redux/slices/authSlice";
import LoadingGif from "../components/LoadingGif";
import {postUpdateUser} from "../services/postUpdateUser";
import {useAppDispatch} from "../hooks/useAppDispatch";

export default function Profile({loggedIn, setLoggedIn} : LoggedInProps) {
    const [userFetched] = useFetchUser();
    const user : User = useAppSelector(selectUser)!;
    const dispatch = useAppDispatch();

    const updateUser = (requestBody : UserUpdateRequest) => {
        return postUpdateUser(requestBody).then(updatedUser => {
            console.log("Updated user:");
            console.log(updatedUser);

            dispatch(setUser(updatedUser));
        });
    }

    const updateFirstName = (newValue : string) => {
        return updateUser({
            userId: user.id,
            firstName: newValue
        });
    };

    const updateLastName = (newValue : string) => {
        return updateUser({
            userId: user.id,
            lastName: newValue
        });
    };
    
    return (
        <>
            <Header loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
            <div className="background-primary mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-32 lg:px-8">
                <div className="mx-auto max-w-2xl">
                    {!userFetched ? <LoadingGif /> : <form>
                        <div className="space-y-12">
                            <h4 className="text-header font-semibold leading-7 border-b p-2">Profile</h4>
                            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                                <div className="col-span-full">
                                    <label htmlFor="photo" className="block text-sm font-medium leading-6">
                                        Photo
                                    </label>
                                    <div className="mt-2 flex items-center gap-x-3">
                                        <img className="rounded-full"
                                             width={128}
                                             src={user.profilePhotoUrl}
                                             alt=""
                                        />
                                        <button
                                            disabled
                                            type="button"
                                            className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                        >
                                            <label
                                                htmlFor="file-upload"
                                                className="disabled relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                            >
                                                <span>Change</span>
                                                <input disabled id="file-upload" name="file-upload" type="file" className="sr-only" />
                                            </label>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-12 mt-0">
                                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <SaveableInput label="First name" postValue={updateFirstName} initialValue_={user.firstName} />
                                    </div>

                                    <div className="sm:col-span-3">
                                        <SaveableInput label="Last name" postValue={updateLastName} initialValue_={user.lastName} />
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label htmlFor="email" className="block text-sm font-medium leading-6">
                                            Email address
                                        </label>
                                        <div className="mt-2 flex flex-row items-center">
                                            <input
                                                disabled
                                                readOnly
                                                value={user.email}
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                className="disabled mr-2 block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label htmlFor="email" className="block text-sm font-medium leading-6">
                                            Password
                                        </label>
                                        <div className="mt-2 flex flex-row items-center">
                                            <button
                                                disabled
                                                type="button"
                                                className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                            >
                                                Change password
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>}
                </div>
            </div>
        </>
    );
}
