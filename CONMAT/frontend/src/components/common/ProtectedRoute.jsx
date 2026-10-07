import { Link, Navigate, useLocation } from 'react-router-dom';
import { getSavedToken, getSavedUser, useAuth } from '../../context/AuthContext';
import { getDashboardRoute, getUserRole, isUserVerified, normalizeRole } from '../../config/navigation';
import './ProtectedRoute.css';

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requireVerifiedForRoles = [],
}) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  const currentUser = user || getSavedUser();
  const currentToken = token || getSavedToken();
  const role = getUserRole(currentUser);
  const allowed = allowedRoles.map(normalizeRole);
  const verificationRoles = requireVerifiedForRoles.map(normalizeRole);

  if (loading) {
    return (
      <section className="protected-route-state">
        <div className="protected-route-card">
          <span className="protected-route-badge">Checking session</span>
          <h2>Loading your workspace</h2>
          <p>ConMat is validating your saved session and role permissions.</p>
        </div>
      </section>
    );
  }

  if (!currentUser || !currentToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowed.length > 0 && !allowed.includes(role)) {
    return (
      <section className="protected-route-state">
        <div className="protected-route-card protected-route-card--blocked">
          <span className="protected-route-badge protected-route-badge--blocked">Access blocked</span>
          <h2>This page is not available for your role</h2>
          <p>Allowed roles: {allowedRoles.join(', ')}.</p>
          <Link to={getDashboardRoute(role)} className="protected-route-btn protected-route-btn--dark">
            Back to Dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (verificationRoles.includes(role) && !isUserVerified(user)) {
    return (
      <section className="protected-route-state">
        <div className="protected-route-card">
          <span className="protected-route-badge">Verification required</span>
          <h2>Your seller verification is required</h2>
          <p>This bidding workspace is available to verified {user.role} accounts.</p>
          <Link to={getDashboardRoute(role)} className="protected-route-btn">
            Back to Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return children;
}
