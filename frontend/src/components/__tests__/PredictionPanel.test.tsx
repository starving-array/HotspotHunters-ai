import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PredictionPanel from '../PredictionPanel';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('PredictionPanel', () => {
  it('submits hotspot prediction and displays result', async () => {
    const hotspotResp = {
      taluk: 'T01',
      risk_level: 'HIGH',
      confidence: 0.9,
      top_features: ['feature1', 'feature2']
    };
    mockedAxios.post.mockResolvedValueOnce({ data: hotspotResp });

    render(<PredictionPanel />);

    fireEvent.change(screen.getByPlaceholderText(/District code/i), { target: { value: 'D01' } });
    fireEvent.change(screen.getByPlaceholderText(/Taluk code/i), { target: { value: 'T01' } });
    fireEvent.click(screen.getByText('Predict'));

    await waitFor(() => expect(screen.getByText(/Taluk:/i)).toBeInTheDocument());
    expect(screen.getByText('T01')).toBeInTheDocument();
    expect(screen.getByText(/Risk:/i)).toHaveTextContent('HIGH (90.0%)');
    expect(screen.getByText(/Features:/i)).toHaveTextContent('feature1, feature2');
  });

  it('submits offender prediction and displays result', async () => {
    const offenderResp = {
      offender_id: 'O123',
      recidivism_risk_score: 0.85,
      risk_label: 'HIGH',
      shap_reasons: ['reason1', 'reason2']
    };
    mockedAxios.post.mockResolvedValueOnce({ data: offenderResp });

    render(<PredictionPanel />);

    fireEvent.change(screen.getByPlaceholderText(/Offender ID/i), { target: { value: 'O123' } });
    fireEvent.click(screen.getAllByText('Predict')[1]); // second button

    await waitFor(() => expect(screen.getByText(/Score:/i)).toBeInTheDocument());
    expect(screen.getByText('0.85')).toBeInTheDocument();
    expect(screen.getByText(/Risk:/i)).toHaveTextContent('HIGH');
    expect(screen.getByText(/Reasons:/i)).toHaveTextContent('reason1, reason2');
  });
});
