import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from '../../components/ShareButton';
import * as shareApi from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  shareApi: {
    saveState: vi.fn(),
  },
}));

describe('ShareButton', () => {
  const mockAppState = {
    gpxFiles: [],
    timestamp: '2024-01-01T00:00:00Z',
  };

  it('should render share button', () => {
    render(<ShareButton appState={mockAppState} />);

    const button = screen.getByRole('button', { name: /partager/i });
    expect(button).toBeInTheDocument();
  });

  it('should show loading state when sharing', async () => {
    // Mock slow API call
    vi.mocked(shareApi.shareApi.saveState).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ShareButton appState={mockAppState} />);

    const button = screen.getByRole('button', { name: /partager/i });
    fireEvent.click(button);

    expect(screen.getByText(/sauvegarde\.\.\./i)).toBeInTheDocument();
  });

  it('should display share URL on success', async () => {
    const mockResponse = {
      success: true,
      share_id: 'abc123',
      url: 'https://www.gpx.ninja/share/abc123',
      expires_at: '2024-02-01T00:00:00Z',
    };

    vi.mocked(shareApi.shareApi.saveState).mockResolvedValue(mockResponse);

    render(<ShareButton appState={mockAppState} />);

    const button = screen.getByRole('button', { name: /partager/i });
    fireEvent.click(button);

    await waitFor(() => {
      // URL uses window.location.origin which is localhost:3000 in tests
      expect(screen.getByDisplayValue(/localhost.*\/share\/abc123/)).toBeInTheDocument();
    });
  });

  it('should display error message on failure', async () => {
    vi.mocked(shareApi.shareApi.saveState).mockRejectedValue(
      new Error('Network error')
    );

    render(<ShareButton appState={mockAppState} />);

    const button = screen.getByRole('button', { name: /partager/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/erreur/i)).toBeInTheDocument();
    });
  });
});
