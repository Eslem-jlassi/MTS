import {useEffect, useState} from "react";

export const DARK : string = 'dark';
export const LIGHT : string = 'light';
const THEME : string = 'theme';

export default function useDarkMode() : [string, Function] {
    const [targetTheme, setTargetTheme] = useState(localStorage.theme);

    const currentTheme = targetTheme === DARK ? LIGHT : DARK;
    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove(currentTheme);
        root.classList.add(targetTheme);

        localStorage.setItem(THEME, targetTheme);
    }, [targetTheme, setTargetTheme, currentTheme])

    return [currentTheme, setTargetTheme];
}
