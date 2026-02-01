import LoadingGif from "./LoadingGif";

export default function Loading() {
    return (<main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center background-secondary p-5 rounded-5">
            <div className="flex flex-col items-center gap-3">
                <LoadingGif />
                <span>Loading...</span>
            </div>
        </div>
    </main>);
}