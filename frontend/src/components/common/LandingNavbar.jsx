import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import './LandingNavbar.css';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Marketplace', path: '/marketplace' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact Us', path: '/contact' }
];

const Logo = () => (
  <div className="landing-navbar__logo">
    <div className="landing-navbar__logo-icon">
      <img src={logo} alt="ConMat" className="landing-navbar__logo-img" />
    </div>

    <div className="landing-navbar__logo-text">
      ConMat
    </div>
  </div>
);

export default function LandingNavbar() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, logout } = useAuth();

  return (
    <nav className="landing-navbar" aria-label="Public navigation">
      <div className="landing-navbar__container">

        {/* LOGO */}
        <button
          type="button"
          className="landing-navbar__logo-button"
          aria-label="Go to ConMat home"
          onClick={() => navigate('/')}
        >
          <Logo />
        </button>

        {/* NAVIGATION LINKS */}
        <div className="landing-navbar__links">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `landing-navbar__link ${
                  isActive ? 'landing-navbar__link--active' : ''
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* AUTH BUTTONS */}
        <div className="landing-navbar__actions">
          {loading ? null : isAuthenticated ? (
            <button
              type="button"
              className="btn btn-login-outline text-dark fw-extra-bold btn-nav-action"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-login-outline text-dark fw-extra-bold btn-nav-action"
                onClick={() => navigate('/login')}
              >
                Login
              </button>

              <button
                type="button"
                className="btn btn-signup fw-extra-bold btn-nav-action"
                onClick={() => navigate('/register')}
              >
                Sign Up
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
