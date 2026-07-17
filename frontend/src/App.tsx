import React from 'react';
import HotspotLeaderboard from './components/HotspotLeaderboard';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import PredictionPanel from './components/PredictionPanel';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="header">KSP Intelligence Dashboard</header>
      <div className="content">
        <aside className="sidebar">
          <SearchBar />
          <PredictionPanel />
          <HotspotLeaderboard />
        </aside>
        <section className="map-area">
          <MapView />
        </section>
      </div>
    </div>
  );
};

export default App;
