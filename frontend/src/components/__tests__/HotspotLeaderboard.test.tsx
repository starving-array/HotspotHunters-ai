import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HotspotLeaderboard from '../HotspotLeaderboard';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('HotspotLeaderboard', () => {
  it('displays fetched hotspots', async () => {
    const data = [{ district: 'D01', score: 42 }];
    mockedAxios.get.mockResolvedValueOnce({ data });

    render(<HotspotLeaderboard />);

    // Wait for async fetch to complete
    await waitFor(() => expect(screen.getByText(/Live Hotspot Leaderboard/i)).toBeInTheDocument());
    expect(screen.getByText('D01: 42')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    render(<HotspotLeaderboard />);
    await waitFor(() => expect(screen.getByText(/Failed to load hotspots/i)).toBeInTheDocument());
  });
});
