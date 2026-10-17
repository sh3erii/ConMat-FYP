import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingNavbar from '../components/common/LandingNavbar';
import RoleNavbar from '../components/common/RoleNavbar';
import PublicFooter from '../components/common/PublicFooter';
import { getDashboardRoute } from '../config/navigation';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <>
      {user ? <RoleNavbar /> : <LandingNavbar />}
      <main className="not-found-page">
        <section className="not-found-card">
          <span>404</span>
          <h1>We could not find that page.</h1>
          <p>The link may be outdated or the route may have changed during the ConMat cleanup.</p>
          <div className="not-found-actions">
            <Link className="btn btn-orange-cta" to={user ? getDashboardRoute(user.role) : '/'}>
              {user ? 'Go to Dashboard' : 'Go Home'}
            </Link>
            <Link className="btn btn-outline-secondary" to="/marketplace">Marketplace</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
