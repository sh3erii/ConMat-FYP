// ============================================================
//  src/App.jsx
//  Root component – sets up all routes
// ============================================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import 'bootstrap/dist/css/bootstrap.min.css';

// ── Protected Route wrapper ──────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{height:'100vh'}}><div className="spinner-border text-warning" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Placeholder pages (will be built Day 2+)
const ComingSoon = ({ page }) => (
  <div style={{ background: '#1e293b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center', color: '#fff' }}>
      <h2 style={{ color: '#f97316' }}>ConMat</h2>
      <p>{page} – Coming Day 2</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<ComingSoon page="Login" />} />
          <Route path="/register"  element={<ComingSoon page="Register" />} />
          <Route path="/marketplace" element={<ProtectedRoute><ComingSoon page="Marketplace" /></ProtectedRoute>} />
          <Route path="/dashboard"   element={<ProtectedRoute><ComingSoon page="Dashboard" /></ProtectedRoute>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
