import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NLQueryBar from '../NLQueryBar';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('NLQueryBar', () => {
  it('translates query and displays result', async () => {
    const respData = {
      crime_type: 'robbery',
      location: 'yelahanka',
      radius_km: 5,
      days_back: 30,
      raw_text: 'Show me robbery near Yelahanka in last 30 days'
    };
    mockedAxios.post.mockResolvedValueOnce({ data: respData });

    render(<NLQueryBar />);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 'Show me robbery/i), { target: { value: 'test query' } });
    fireEvent.click(screen.getByText(/Translate & Search/i));

    await waitFor(() => expect(screen.getByText(/Parsed:/i)).toBeInTheDocument());
    expect(screen.getByText(/"crime_type": "robbery"/i)).toBeInTheDocument();
  });

  it('shows error on failed request', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    render(<NLQueryBar />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 'Show me robbery/i), { target: { value: 'test' } });
    fireEvent.click(screen.getByText(/Translate & Search/i));
    await waitFor(() => expect(screen.getByText(/NL query failed/i)).toBeInTheDocument());
  });
});
