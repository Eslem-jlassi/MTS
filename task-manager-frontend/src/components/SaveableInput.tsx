import React, {useEffect, useState} from "react";
import {MIN_VALUE_LENGTH} from "../common/constants";
import {InputTarget} from "../common/commonTypes";

type SaveableInputProp = {
    label: string;
    postValue: (value: string) => Promise<any>;
    initialValue_? : string;
}

export default function SaveableInput({label, postValue, initialValue_} : SaveableInputProp) {
    const [initialValue, setInitialValue] = useState(initialValue_);
    const [value, setValue] = useState(initialValue);
    const [buttonIsActive, setButtonIsActive] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = ({target} : InputTarget) => {
        setValue(target.value);
    };

    const saveValue = (event : React.MouseEvent<HTMLElement>) => {
        event.preventDefault();

        const errorMessage = validateValue();
        if (errorMessage) {
            setErrorMessage(errorMessage);
            return;
        }

        setErrorMessage('');

        postValue(value!).then(result => {
            console.log("Updated value:");
            console.log(result);

            setInitialValue(value);
            setButtonIsActive(false);
        });
    };

    function validateValue() : string | null {
        const valid = value !== undefined && value !== null && value.length >= MIN_VALUE_LENGTH;
        return valid ? null : `Value must be at least ${MIN_VALUE_LENGTH} symbols length`;
    }

    useEffect(() => {
        if (value === initialValue) {
            setButtonIsActive(false);
            return;
        }
        setButtonIsActive(true);
    }, [initialValue, value]);

    const kebabCased = toKebabCase(label);
    return (
        <>
            <label htmlFor={kebabCased} className="block text-sm font-medium leading-6">
                {label}
            </label>
            <div className="mt-2 flex flex-row items-center">
                <input
                    value={value}
                    onChange={handleChange}
                    type="text"
                    name={kebabCased}
                    id={kebabCased}
                    className="text-black block mr-2 w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                <button disabled={!buttonIsActive} onClick={saveValue}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                </button>
            </div>
            {errorMessage && <div className="p-1 text-sm text-red-800 rounded-lg" role="alert">
                {errorMessage}
            </div>}
        </>
    );
}

function toKebabCase(str : string) {
    return str.toLowerCase().replace(/\s+/g, '-');
}
