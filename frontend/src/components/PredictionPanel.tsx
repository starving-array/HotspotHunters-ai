import React, { useState } from 'react';
import axios from 'axios';

type HotspotResp = {
  taluk: string;
  risk_level: string;
  confidence: number;
  top_features: string[];
};

type OffenderResp = {
  offender_id: string;
  recidivism_risk_score: number;
  risk_label: string;
  shap_reasons: string[];
};

const PredictionPanel: React.FC = () => {
  // Hotspot
  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [hotspotResult, setHotspotResult] = useState<HotspotResp | null>(null);
  const [hotspotError, setHotspotError] = useState<string | null>(null);

  // Offender
  const [offenderId, setOffenderId] = useState('');
  const [offenderResult, setOffenderResult] = useState<OffenderResp | null>(null);
  const [offenderError, setOffenderError] = useState<string | null>(null);

  const submitHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.post<HotspotResp>('/api/v1/predict/hotspot', {
        district_code: district,
        taluk_code: taluk,
      });
      setHotspotResult(resp.data);
      setHotspotError(null);
    } catch (e: any) {
      setHotspotError(e.message || 'Hotspot prediction failed');
    }
  };

  const submitOffender = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.post<OffenderResp>('/api/v1/predict/offender', {
        offender_id: offenderId,
      });
      setOffenderResult(resp.data);
      setOffenderError(null);
    } catch (e: any) {
      setOffenderError(e.message || 'Offender prediction failed');
    }
  };

  return (
    <div>
      <h3>Hotspot Prediction</h3>
      <form onSubmit={submitHotspot}>
        <input
          type="text"
          placeholder="District code (e.g., D01)"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          style={{ width: '100%', marginBottom: '0.4rem' }}
        />
        <input
          type="text"
          placeholder="Taluk code (optional)"
          value={taluk}
          onChange={(e) => setTaluk(e.target.value)}
          style={{ width: '100%', marginBottom: '0.4rem' }}
        />
        <button type="submit" style={{ width: '100%' }}>
          Predict
        </button>
      </form>
      {hotspotError && <p style={{ color: 'red' }}>{hotspotError}</p>}
      {hotspotResult && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Taluk:</strong> {hotspotResult.taluk}<br />
          <strong>Risk:</strong> {hotspotResult.risk_level} ({(hotspotResult.confidence * 100).toFixed(1)}%)<br />
          <strong>Features:</strong> {hotspotResult.top_features.join(', ')}
        </div>
      )}

      <hr style={{ margin: '1rem 0' }} />

      <h3>Offender Recidivism Prediction</h3>
      <form onSubmit={submitOffender}>
        <input
          type="text"
          placeholder="Offender ID"
          value={offenderId}
          onChange={(e) => setOffenderId(e.target.value)}
          style={{ width: '100%', marginBottom: '0.4rem' }}
        />
        <button type="submit" style={{ width: '100%' }}>
          Predict
        </button>
      </form>
      {offenderError && <p style={{ color: 'red' }}>{offenderError}</p>}
      {offenderResult && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Score:</strong> {offenderResult.recidivism_risk_score}<br />
          <strong>Risk:</strong> {offenderResult.risk_label}<br />
          <strong>Reasons:</strong> {offenderResult.shap_reasons.join(', ')}
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;
