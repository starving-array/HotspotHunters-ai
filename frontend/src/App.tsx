import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './api/axiosConfig';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import FullPageLoader from './components/FullPageLoader';
import RouteGuard from './components/RouteGuard';
import Layout from './components/Layout';

// Route-level code-splitting. Login ships in the main bundle
// (first-paint critical). All other pages lazy-load.
const Login = lazy(() => import('./pages/Login'));
const Overview = lazy(() => import('./pages/Overview'));
const OverviewMap = lazy(() => import('./pages/OverviewMap'));
const Hotspots = lazy(() => import('./pages/Hotspots'));
const NetworkGraph = lazy(() => import('./pages/NetworkGraph'));
const Anomalies = lazy(() => import('./pages/Anomalies'));
const Cybercrime = lazy(() => import('./pages/Cybercrime'));
const Trends = lazy(() => import('./pages/Trends'));
const FIRSearch = lazy(() => import('./pages/FIRSearch'));
const IODashboard = lazy(() => import('./pages/IODashboard'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const Settings = lazy(() => import('./pages/Settings'));

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: (
      <RouteGuard>
        <Layout />
      </RouteGuard>
    ),
    children: [
      { index: true, element: <Overview /> },
      { path: 'map', element: <OverviewMap /> },
      { path: 'hotspots', element: <Hotspots /> },
      { path: 'network', element: <NetworkGraph /> },
      { path: 'anomalies', element: <Anomalies /> },
      { path: 'cybercrime', element: <Cybercrime /> },
      { path: 'trends', element: <Trends /> },
      { path: 'fir-search', element: <FIRSearch /> },
      { path: 'io-dashboard', element: <IODashboard /> },
      { path: 'audit', element: <AuditTrail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<FullPageLoader />}>
              <RouterProvider router={router} />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
