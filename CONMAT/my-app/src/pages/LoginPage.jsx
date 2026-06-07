import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthNavbar from '../components/common/AuthNavbar';
import FormAlert from '../components/common/FormAlert';
import './LoginPage.css';
import './LandingPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginRequest } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sessionMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('session') === 'expired'
      ? 'Your session expired. Please login again to continue.'
      : '';
  }, [location.search]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Email and password are required.');
      return;
    }

    try {
      setLoading(true);
      const data = await loginRequest({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });
      navigate('/dashboard', {
        replace: true,
        state: { message: `Welcome back, ${data.user?.name || 'ConMat user'}!` }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <AuthNavbar />

      <section className="login-page__grid">
        <aside className="login-page__panel">
          <span className="login-page__eyebrow">Secure role-based access</span>
          <h1>
            Login to manage <span className="text-brand" style={{ fontWeight: 800 }}>ConMat</span> materials
            faster.
          </h1>
          <p>
            Continue to your ConMat workspace for verified suppliers, product listings,
            order tracking, bulk bidding and secure payment workflows.
          </p>
        </aside>

        <section className="login-card d-flex flex-column justify-content-center p-4 p-lg-5 flex-lg-grow-1" aria-label="Login form" style={{ flexBasis: 0 }}>
          <div className="login-card__header">
            <div className="icon-box icon-box-trust rounded-4 d-flex align-items-center justify-content-center shadow-theme" style={{ width: '52px', height: '52px' }}>
              <Lock size={24} />
            </div>
            <div>
              <h2>Welcome back</h2>
              <p>Use your email and password to continue.</p>
            </div>
          </div>

          <FormAlert type="info">{sessionMessage}</FormAlert>
          <FormAlert type="error">{error}</FormAlert>

          <form className="login-card__form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <div className="login-card__field">
                <Mail size={18} style={{ opacity: 0.5 }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="customer@conmat.pk"
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="login-card__field">
                <Lock size={18} style={{ opacity: 0.5 }} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button className="btn btn-orange-cta login-card__button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="login-card__switch">
            New to ConMat? <Link to="/register">Create Account</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
