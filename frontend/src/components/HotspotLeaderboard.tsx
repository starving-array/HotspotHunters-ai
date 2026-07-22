import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Hotspot = {
  district: string;
  score: number;
};

const HotspotLeaderboard: React.FC = () => {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHotspots = async () => {
    try {
      const resp = await axios.get<Hotspot[]>('/api/v1/hotspots/live?limit=10');
      setHotspots(resp.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load hotspots');
    }
  };

  useEffect(() => {
    fetchHotspots();
    const interval = setInterval(fetchHotspots, 15_000); // refresh every 15 s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Live Hotspot Leaderboard</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {hotspots.map((h) => (
          <li key={h.district}>
            {h.district}: {h.score.toFixed(0)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HotspotLeaderboard;
