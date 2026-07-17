import React, { useEffect, useState } from 'react';

type Alert = Record<string, any>;

const LiveAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/v1/alerts/stream');
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setAlerts((prev) => [data, ...prev].slice(0, 20)); // keep recent 20
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };
    source.onerror = (e) => {
      setError('Connection lost to alerts stream');
      source.close();
    };
    return () => {
      source.close();
    };
  }, []);

  return (
    <div>
      <h3>Live Alerts</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {alerts.map((a, idx) => (
          <li key={idx}>{JSON.stringify(a)}</li>
        ))}
      </ul>
    </div>
  );
};

export default LiveAlerts;
