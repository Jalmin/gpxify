import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Composant qui lance une erreur pour tester l'ErrorBoundary
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Supprimer les console.error pendant les tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Oups, une erreur s'est produite/i)).toBeInTheDocument();
    // Utiliser getByRole pour cibler le bouton spécifiquement
    expect(screen.getByRole('button', { name: /Recharger la page/i })).toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('reloads page when reload button is clicked', async () => {
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Utiliser getByRole pour cibler le bouton précisément
    const reloadButton = screen.getByRole('button', { name: /Recharger la page/i });
    await user.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it('shows error details in development mode', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // En mode dev (par défaut dans vitest), le message d'erreur devrait être visible
    expect(screen.getByText(/Error: Test error/i)).toBeInTheDocument();
  });

  it('provides contact support link', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const supportLink = screen.getByText(/contactez le support/i);
    expect(supportLink).toBeInTheDocument();
    expect(supportLink.closest('a')).toHaveAttribute('href', 'mailto:support@gpx.ninja');
  });
});
