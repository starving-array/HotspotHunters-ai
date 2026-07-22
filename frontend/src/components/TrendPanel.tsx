import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface TrendPoint {
  month: string;
  count: number;
}

interface District {
  districtCode: string;
  districtName: string;
}

const TrendPanel: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selected, setSelected] = useState('');
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get<{ districtCode: string; districtName: string }[]>('/api/v1/hotspots/live')
      .then((resp) => {
        const mapped = (resp.data as any[]).map((d: any) => ({
          districtCode: d.district ?? '',
          districtName: d.district ?? '',
        }));
        setDistricts(mapped);
      })
      .catch(() => {});
  }, []);

  const fetchTrends = async (districtCode: string) => {
    if (!districtCode) return;
    try {
      const resp = await axios.get<TrendPoint[]>(`/api/v1/trends/${districtCode}`, { params: { months: 12 } });
      setTrends(resp.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load trends');
    }
  };

  useEffect(() => {
    if (selected) fetchTrends(selected);
  }, [selected]);

  const maxCount = Math.max(...trends.map((t) => t.count), 1);

  const monthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length < 2) return m;
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    return months[parseInt(parts[1], 10) - 1] || parts[1];
  };

  return (
    <div>
      <h3>Crime Trends</h3>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.3rem' }}
      >
        <option value="">Select district</option>
        {districts.map((d) => (
          <option key={d.districtCode} value={d.districtCode}>
            {d.districtName}
          </option>
        ))}
      </select>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {trends.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100, marginTop: '0.5rem' }}>
          {trends.map((t) => (
            <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                title={`${t.month}: ${t.count}`}
                style={{
                  width: '100%',
                  height: `${(t.count / maxCount) * 80}px`,
                  minHeight: 2,
                  background: '#4a90d9',
                  borderRadius: '2px 2px 0 0',
                }}
              />
              <span style={{ fontSize: 9, marginTop: 2 }}>{monthLabel(t.month)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendPanel;
