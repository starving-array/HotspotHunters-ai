import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Default icon fix for Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type FIRRecord = {
  fir_id: string;
  district: string;
  crime_type: string;
  latitude: number;
  longitude: number;
};

type SearchResponse = {
  hits: Array<{
    fir_id: string;
    district: string;
    crime_type: string;
    location: { lat: number; lon: number };
    incident_ts: string;
    registered_ts: string;
    status: string;
  }>;
  totalHits: number;
};

const MapView: React.FC = () => {
  const [records, setRecords] = useState<FIRRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRecent = async () => {
    try {
      const resp = await axios.get<SearchResponse>('/api/v1/search', {
        params: { q: '', lat: '', lon: '', radiusKm: 5 },
      });
      const mapped = (resp.data.hits || []).map((h) => ({
        fir_id: h.fir_id,
        district: h.district,
        crime_type: h.crime_type,
        latitude: h.location?.lat ?? 0,
        longitude: h.location?.lon ?? 0,
      }));
      setRecords(mapped);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load map data');
    }
  };

  useEffect(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 30_000);
    return () => clearInterval(interval);
  }, []);

  const center: [number, number] = [14.5, 76.5]; // approximate centre of Karnataka

  return (
    <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {records.map((r) => (
        <Marker key={r.fir_id} position={[r.latitude, r.longitude]}>
          <Popup>
            <strong>{r.crime_type}</strong><br />
            District: {r.district}<br />
            FIR: {r.fir_id}
          </Popup>
        </Marker>
      ))}
      {error && <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(255,0,0,0.5)', color: '#fff', padding: '0.5rem' }}>{error}</div>}
    </MapContainer>
  );
};

export default MapView;
