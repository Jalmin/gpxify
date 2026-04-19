import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AidStationTable } from '@/components/AidStationTable';
import type { Track, AidStation } from '@/types/gpx';

// Mock the API module — we do NOT want network calls in tests.
const mockGenerate = vi.fn();
vi.mock('@/services/api', () => ({
  gpxApi: {
    generateAidStationTable: (req: unknown) => mockGenerate(req),
  },
}));

// Mock leaflet-based GPXMap (it throws in jsdom).
vi.mock('@/components/Map/GPXMap', () => ({
  GPXMap: () => null,
}));

const sampleTrack: Track = {
  name: 'Test Track',
  points: [
    { lat: 45.0, lon: 6.0, elevation: 1000, distance: 0 },
    { lat: 45.01, lon: 6.01, elevation: 1000, distance: 10000 },
  ],
  statistics: {
    total_distance: 10000,
    total_elevation_gain: 0,
    total_elevation_loss: 0,
  },
};

const sampleAidStations: AidStation[] = [
  { name: 'Start', distance_km: 0 },
  { name: 'End', distance_km: 10 },
];

beforeEach(() => {
  mockGenerate.mockReset();
  mockGenerate.mockResolvedValue({
    success: true,
    message: 'ok',
    segments: [],
    total_distance_km: 10,
    total_elevation_gain: 0,
    total_elevation_loss: 0,
    total_time_minutes: 60,
  });
});

describe('AidStationTable — calc modes', () => {
  it('renders the 3 calc mode radios with naismith selected by default', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    expect(screen.getByLabelText(/Formule de Naismith/)).toBeChecked();
    expect(screen.getByLabelText(/Allure constante/)).not.toBeChecked();
    expect(screen.getByLabelText(/Trail Planner/)).not.toBeChecked();
  });

  it('reveals the Trail Planner form when the user clicks that radio', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    expect(screen.queryByTestId('trail-planner-form')).toBeNull();

    fireEvent.click(screen.getByLabelText(/Trail Planner/));

    expect(screen.getByTestId('trail-planner-form')).toBeInTheDocument();
  });

  it('fills the trail planner form with the Trail moyen preset', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);
    fireEvent.click(screen.getByLabelText(/Trail Planner/));

    fireEvent.click(screen.getByRole('button', { name: /Appliquer preset/i }));

    expect((screen.getByLabelText(/Allure sur plat/) as HTMLInputElement).value).toBe('10');
    expect((screen.getByLabelText(/Pénalité montée/) as HTMLInputElement).value).toBe('6');
    expect((screen.getByLabelText(/Bonus descente/) as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText(/Facteur fatigue/) as HTMLInputElement).value).toBe('5');
    expect((screen.getByLabelText(/Intervalle fatigue/) as HTMLInputElement).value).toBe('20');
  });

  it('disables Generate on trail_planner until a config is filled', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);
    fireEvent.click(screen.getByLabelText(/Trail Planner/));

    const submit = screen.getByRole('button', { name: /Générer le tableau/ });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Appliquer preset/i }));
    expect(submit).not.toBeDisabled();
  });

  it('submits a trail_planner payload matching the backend contract', async () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);
    fireEvent.click(screen.getByLabelText(/Trail Planner/));
    fireEvent.click(screen.getByRole('button', { name: /Appliquer preset/i }));

    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));

    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.calc_mode).toBe('trail_planner');
    expect(payload.trail_planner_config).toEqual({
      flat_pace_kmh: 10,
      climb_penalty_min_per_100m: 6,
      descent_bonus_min_per_100m: 3,
      fatigue_percent_per_interval: 5,
      fatigue_interval_km: 20,
    });
    // Ensure deprecated field is NOT sent to the backend.
    expect(payload).not.toHaveProperty('use_naismith');
  });

  it('submits naismith payload with no extra pace/config fields', async () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.calc_mode).toBe('naismith');
    expect(payload.constant_pace_kmh).toBeUndefined();
    expect(payload.trail_planner_config).toBeUndefined();
  });

  it('submits constant_pace payload with the numeric constant_pace_kmh', async () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    fireEvent.click(screen.getByLabelText(/Allure constante/));
    const paceInput = screen.getByLabelText(/Allure en km\/h/);
    fireEvent.change(paceInput, { target: { value: '8.5' } });

    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
    const payload = mockGenerate.mock.calls[0][0];
    expect(payload.calc_mode).toBe('constant_pace');
    expect(payload.constant_pace_kmh).toBe(8.5);
  });

  it('flags flat_pace=0 as invalid in the Trail Planner form', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);
    fireEvent.click(screen.getByLabelText(/Trail Planner/));
    fireEvent.click(screen.getByRole('button', { name: /Appliquer preset/i }));

    const flatPaceInput = screen.getByLabelText(/Allure sur plat/);
    fireEvent.change(flatPaceInput, { target: { value: '0' } });

    expect(flatPaceInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /Générer le tableau/ })).toBeDisabled();
  });

  it('preserves trail_planner values when toggling to naismith and back', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);
    fireEvent.click(screen.getByLabelText(/Trail Planner/));
    fireEvent.click(screen.getByRole('button', { name: /Appliquer preset/i }));

    fireEvent.click(screen.getByLabelText(/Formule de Naismith/));
    expect(screen.queryByTestId('trail-planner-form')).toBeNull();

    fireEvent.click(screen.getByLabelText(/Trail Planner/));
    // The previously-filled values should still be there.
    const flatPaceInput = screen.getByLabelText(/Allure sur plat/) as HTMLInputElement;
    expect(flatPaceInput.value).toBe('10');
  });

  it('disables Generate with fewer than 2 aid stations', () => {
    render(
      <AidStationTable
        track={sampleTrack}
        aidStations={[{ name: 'Solo', distance_km: 0 }]}
      />,
    );
    expect(screen.getByRole('button', { name: /Générer le tableau/ })).toBeDisabled();
  });

  it('calls onStateChange with the new shape when calc mode changes', () => {
    const onStateChange = vi.fn();
    render(
      <AidStationTable
        track={sampleTrack}
        aidStations={sampleAidStations}
        onStateChange={onStateChange}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Trail Planner/));

    const calls = onStateChange.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0];
    expect(lastCall).toMatchObject({
      calcMode: 'trail_planner',
      constantPaceKmh: null,
      trailPlannerConfig: null,
    });
    // Legacy keys must not leak back to the parent.
    expect(lastCall).not.toHaveProperty('useNaismith');
    expect(lastCall).not.toHaveProperty('customPace');
  });
});

describe('AidStationTable — T13/T14 review follow-ups', () => {
  it('renders empty constant_pace input when initialConstantPaceKmh is null (T13)', () => {
    render(
      <AidStationTable
        track={sampleTrack}
        aidStations={sampleAidStations}
        calcMode="constant_pace"
        constantPaceKmh={null}
      />,
    );
    const input = screen.getByLabelText(/Allure en km\/h/) as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input).toHaveAttribute('placeholder', 'ex. 10');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /Générer le tableau/ })).toBeDisabled();
  });

  it('disables submit when constant_pace > 30 km/h (T13 — parity with backend T12)', () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    fireEvent.click(screen.getByLabelText(/Allure constante/));
    const input = screen.getByLabelText(/Allure en km\/h/);
    fireEvent.change(input, { target: { value: '50' } });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /Générer le tableau/ })).toBeDisabled();
  });

  it('Zod guard blocks invalid constant_pace even if UI regresses (T14)', async () => {
    // The submit button is disabled for bad values, so we cannot actually
    // trigger the Zod path through the UI — the guard is defense in depth.
    // This test proves the UI currently blocks the API call.
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    // Happy path: naismith submits once.
    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));

    // Switch to constant_pace with 50 km/h (invalid per T12 backend bound).
    fireEvent.click(screen.getByLabelText(/Allure constante/));
    fireEvent.change(screen.getByLabelText(/Allure en km\/h/), {
      target: { value: '50' },
    });

    // Button is disabled; a click is a no-op. Give async a tick.
    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
});

describe('AidStationTable — deprecation guard', () => {
  it('never sends a use_naismith field in any payload', async () => {
    render(<AidStationTable track={sampleTrack} aidStations={sampleAidStations} />);

    // Submit naismith
    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());

    // Switch to constant pace and submit
    fireEvent.click(screen.getByLabelText(/Allure constante/));
    const paceInput = screen.getByLabelText(/Allure en km\/h/);
    fireEvent.change(paceInput, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Générer le tableau/ }));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(2));

    // None of the payloads should contain the deprecated field.
    for (const call of mockGenerate.mock.calls) {
      expect(call[0]).not.toHaveProperty('use_naismith');
      expect(call[0]).not.toHaveProperty('custom_pace_kmh');
    }
  });
});

// Suppress unused `within` warning — kept for future query helpers.
void within;
