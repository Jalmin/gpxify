import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Error Boundary pour capturer les erreurs React et éviter l'écran blanc
 * Affiche un message d'erreur convivial avec option de rechargement
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log l'erreur pour debugging
    console.error('ErrorBoundary caught error:', error, errorInfo);

    this.setState({
      errorInfo: errorInfo.componentStack
    });

    // TODO: Envoyer vers service de monitoring (Sentry, LogRocket, etc.)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Sinon, afficher l'interface par défaut
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            {/* Icon d'erreur */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Message d'erreur */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Oups, une erreur s'est produite
            </h1>

            <p className="text-gray-600 text-center mb-6">
              Une erreur inattendue est survenue. Vous pouvez essayer de recharger la page.
            </p>

            {/* Détails de l'erreur (mode dev uniquement) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-mono text-red-600 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs font-mono text-gray-600">
                    <summary className="cursor-pointer text-gray-700 font-semibold mb-1">
                      Stack trace
                    </summary>
                    <pre className="overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Recharger la page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Réessayer
              </button>
            </div>

            {/* Lien de contact/support */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Si le problème persiste,{' '}
                <a
                  href="mailto:support@gpx.ninja"
                  className="text-primary hover:underline"
                >
                  contactez le support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
