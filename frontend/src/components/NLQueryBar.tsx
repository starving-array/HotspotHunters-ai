import React, { useState } from 'react';
import axios from 'axios';

type NLResponse = {
  crime_type?: string;
  location?: string;
  radius_km?: number;
  days_back?: number;
  raw_text: string;
};

const NLQueryBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.post<NLResponse>('/api/v1/nl/query', { query });
      setResult(resp.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'NL query failed');
    }
  };

  return (
    <div>
      <h3>Natural‑Language Query</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={3}
          placeholder="e.g. 'Show me robbery cases near Yelahanka in the last 30 days'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <button type="submit" style={{ width: '100%' }}>Translate & Search</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Parsed:</strong>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default NLQueryBar;
