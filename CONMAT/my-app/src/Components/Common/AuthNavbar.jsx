import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import './AuthNavbar.css';
import '../../pages/LandingPage.css';

export default function AuthNavbar() {
  return (
    <header className="auth-nav w-100 sticky-top navbar-sticky border-bottom border-secondary border-opacity-10 py-2 py-md-3">
      <div className="container-fluid px-3 px-md-4 d-flex justify-content-between align-items-center">
        <Link className="auth-nav__brand" to="/">
          <div className="logo-icon d-flex align-items-center justify-content-center fw-bold text-white shadow-sm">
            C
          </div>
          <div className="fs-4 fs-md-3 mb-0 lh-1 ls-tight text-brand" style={{ fontWeight: 800 }}>ConMat</div>
        </Link>

        <Link to="/" className="auth-nav__exit" title="Exit to Website">
          <LogOut size={20} />
          <span>Exit</span>
        </Link>
      </div>
    </header>
  );
}
