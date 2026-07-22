import React from 'react';
import './api/axiosConfig';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import HotspotLeaderboard from './components/HotspotLeaderboard';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import PredictionPanel from './components/PredictionPanel';
import LiveAlerts from './components/LiveAlerts';
import NLQueryBar from './components/NLQueryBar';
import TrendPanel from './components/TrendPanel';

const Dashboard: React.FC = () => {
  const { username, logout } = useAuth();
  return (
    <div className="app-container">
      <header className="header">
        <span>KSP Intelligence Dashboard</span>
        <span style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
          {username} <button onClick={logout} style={{ marginLeft: '0.5rem' }}>Sign Out</button>
        </span>
      </header>
      <div className="content">
        <aside className="sidebar">
          <SearchBar />
          <NLQueryBar />
          <PredictionPanel />
          <TrendPanel />
          <HotspotLeaderboard />
          <LiveAlerts />
        </aside>
        <section className="map-area">
          <MapView />
        </section>
      </div>
    </div>
  );
};

const AppInner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
