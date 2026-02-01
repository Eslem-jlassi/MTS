interface ErrorPageProps {
    error: Error
    resetErrorBoundary: () => void
}

export default function ErrorPage({ error, resetErrorBoundary } : ErrorPageProps) {
    return (
        <div role="alert" className="background-primary">
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Try again</button>
        </div>
    )
}
