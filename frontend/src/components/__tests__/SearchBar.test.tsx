import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from '../SearchBar';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('SearchBar', () => {
  it('performs search and displays results', async () => {
    const results = [{ id: '1', crime_type: 'theft' }];
    mockedAxios.get.mockResolvedValueOnce({ data: results });

    render(<SearchBar />);
    fireEvent.change(screen.getByPlaceholderText(/Enter keywords/i), { target: { value: 'theft' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByText(/\"crime_type\": \"theft\"/i)).toBeInTheDocument());
  });

  it('shows error on failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('fail'));
    render(<SearchBar />);
    fireEvent.change(screen.getByPlaceholderText(/Enter keywords/i), { target: { value: 'fail' } });
    fireEvent.click(screen.getByText('Search'));
    await waitFor(() => expect(screen.getByText(/Search failed/i)).toBeInTheDocument());
  });
});
