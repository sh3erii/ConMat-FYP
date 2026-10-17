import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import './AuthNavbar.css';
import logoImg from '../../assets/logo.png';

export default function AuthNavbar() {
  return (
    <header className="auth-nav">
      <div className="container-fluid px-3 px-md-4 d-flex justify-content-between align-items-center">
        <Link className="auth-nav__brand" to="/">
          <div className="auth-nav__logo-icon">
            <img src={logoImg} alt="ConMat" className="auth-nav__logo-img" />
          </div>
          <span className="auth-nav__logo-text">ConMat</span>
        </Link>

        <Link to="/" className="auth-nav__exit" title="Exit to Website">
          <LogOut size={18} />
          <span>Exit</span>
        </Link>
      </div>
    </header>
  );
}