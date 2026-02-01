import {EventHandler, useEffect} from 'react';

export default function useScript (url: string, onload: EventHandler<any>) {
    useEffect(() => {
        const script = document.createElement('script');

        script.src = url;
        script.onload = onload;

        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, [url, onload]);
};
