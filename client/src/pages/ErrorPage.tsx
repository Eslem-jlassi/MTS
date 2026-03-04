import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { FallbackProps } from 'react-error-boundary';

export default function ErrorPage({ error, resetErrorBoundary }: FallbackProps) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return (
        <div className="min-h-screen bg-ds-page flex items-center justify-center px-6 py-24">
            <div className="text-center max-w-lg">
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-red-100 rounded-full">
                        <AlertCircle className="w-16 h-16 text-red-600" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-ds-primary mb-4">
                    Une erreur s'est produite
                </h1>
                
                <p className="text-base leading-7 text-ds-secondary mb-4">
                    Nous sommes désolés, une erreur inattendue s'est produite.
                </p>
                
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-medium text-red-800">Détails de l'erreur:</p>
                        <p className="text-sm text-red-700 mt-1 font-mono break-all">
                            {errorMessage}
                        </p>
                    </div>
                )}
                
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={resetErrorBoundary}
                        className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Réessayer
                    </button>
                    
                    <a
                        href="/"
                        className="flex items-center gap-2 rounded-md bg-ds-elevated px-4 py-2.5 text-sm font-semibold text-ds-primary shadow-sm hover:bg-ds-elevated"
                    >
                        <Home className="w-4 h-4" />
                        Accueil
                    </a>
                </div>
            </div>
        </div>
    );
}
