import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Hammer, Lock, BarChart3 } from 'lucide-react';
import cementImg from '../assets/cement.png';
import steelImg from '../assets/Steel.png';
import brickImg from '../assets/brick.png';
import './Landingpage.css';
/** DATA **/
const featureData = [
  { icon: ShieldCheck, title: 'Verified Suppliers', desc: 'Every vendor is vetted through our detailed verification workflow.', color: 'white', theme: 'trust' },
  { icon: Hammer, title: 'Bulk Bidding', desc: 'Place a request and let suppliers compete for your material order.', color: 'brand', theme: 'glass' },
  { icon: Lock, title: 'Secure Payments', desc: 'Escrow-style fund release with instant invoice generation.', color: 'white', theme: 'security' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track price shifts, demand signals, and supplier performance.', color: 'obsidian', theme: 'glass' }
];

const priceForecast = [
  { label: 'Steel (Grade 60)', value: '+5.2%', note: 'Higher demand after recent cement orders.' },
  { label: 'Cement (OPC)', value: '−0.8%', note: 'Local supply stabilized and freight costs eased.' },
  { label: 'Bricks (A-Grade)', value: '+2.5%', note: 'Seasonal demand remains steady in urban projects.' }
];

const materials = [
  { title: 'OPC Cement', subtitle: 'Ordinary Portland Cement', price: 'PKR 1,240/bag', image: cementImg },
  { title: 'Grade 60 Steel', subtitle: 'Deformed Bars', price: 'PKR 265/kg', image: steelImg },
  { title: 'Red Bricks', subtitle: 'First-Class A-Grade', price: 'PKR 18.5/1k', image: brickImg }
];

/** SUB-COMPONENTS **/
export const Logo = () => (
  <div className="d-flex align-items-center gap-2">
    <div className="logo-icon d-flex align-items-center justify-content-center fw-bold text-white shadow-sm">
      C
    </div>
    <div className="fs-4 fs-md-3 mb-0 lh-1 ls-tight text-brand" style={{ fontWeight: 800 }}>ConMat</div>
  </div>
);

const Navbar = ({ navigate, location }) => {
  const links = [
    { name: 'Home', path: '/' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Bidding', path: '/bidding' },
  ];

  return (
    <nav className="sticky-top navbar-sticky border-bottom border-secondary border-opacity-10 py-2 py-md-3">
      <div className="container-fluid px-3 px-md-4 position-relative">
      {/* Main Row: Logo, Centered Nav (Desktop), and Actions */}
      <div className="d-flex justify-content-between align-items-center">
        {/* Left Side: Logo Wrapper */}
        <div className="d-flex align-items-center" style={{ flexBasis: 0 }}>
          <Logo />
        </div>
        
        {/* Center Side: Nav Links (Desktop) */}
        <div className="d-none d-md-flex gap-2 gap-lg-4 gap-xl-5 align-items-center justify-content-center position-absolute top-50 start-50 translate-middle">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                className={`btn btn-link text-decoration-none p-0 fs-6 ls-tight transition-all position-relative ${
                  isActive ? 'text-brand' : 'text-dark'
                }`}
                style={{ fontWeight: 700 }}
                onClick={() => navigate(link.path)}
              >
                {link.name}
                {isActive && (
                  <div 
                    className="position-absolute start-0 w-100 bg-brand" 
                    style={{ height: '3px', bottom: '-8px', borderRadius: '2px' }} 
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side: Action Buttons Wrapper - Stacked on mobile with Sign Up on top */}
        <div className="d-flex flex-column-reverse flex-md-row align-items-end align-items-md-center gap-1 gap-md-3 ms-auto" style={{ flexBasis: 0 }}>
          <button className="btn btn-login-outline text-dark fw-extra-bold d-flex justify-content-center align-items-center btn-nav-action" onClick={() => navigate('/login')}>Login</button>
          <button className="btn btn-orange-cta shadow-sm fw-extra-bold border-0 text-white d-flex justify-content-center align-items-center btn-nav-action" onClick={() => navigate('/register')}>Sign Up</button>
        </div>
      </div>

      {/* Mobile Links Row */}
      <div className="d-flex d-md-none justify-content-center gap-3 mt-2 pt-2 border-top border-secondary border-opacity-10">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              className={`btn btn-link text-decoration-none p-1 fs-7 ls-tight transition-all position-relative ${
                isActive ? 'text-brand' : 'text-dark'
              }`}
              style={{ fontWeight: 700 }}
              onClick={() => navigate(link.path)}
            >
              {link.name}
              {isActive && (
                <div className="position-absolute start-0 w-100 bg-brand" style={{ height: '2px', bottom: '-2px', borderRadius: '1px' }} />
              )}
            </button>
          );
        })}
      </div>
      </div>
    </nav>
  );
};

const FeaturesGrid = () => (
  <div className="row row-cols-1 row-cols-md-2 g-4">
    {featureData.map((item, index) => {
      const isWhite = item.color === 'white';
      const Icon = item.icon;
      return (
        <div key={item.title} className="col">
          <div className={`card h-100 p-4 p-md-5 rounded-5 border-0 shadow-premium transition-all feature-card feature-card-${item.color} text-center text-md-start ${index === 1 ? 'feature-card-featured' : ''}`}>
            <div className={`rounded-4 d-flex align-items-center justify-content-center mb-4 icon-box icon-box-${item.theme} shadow-theme mx-auto mx-md-0`}>
              <Icon size={32} strokeWidth={2.5} />
            </div>
            <div className={`fw-extra-bold h4 mb-3 ls-tight ${isWhite ? 'text-dark' : 'text-white'}`}>{item.title}</div>
            <div className={`${isWhite ? 'text-dark' : 'text-white'}`} style={{ fontSize: '1rem', lineHeight: '1.6' }}>{item.desc}</div>
          </div>
        </div>
      );
    })}
  </div>
);

const MaterialsSection = ({ materials, navigate }) => (
  <section className="mt-5">
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
      <div>
        <h2 className="fw-extra-bold h3 mb-1 ls-tight text-dark">Materials</h2>
        <p className="text-dark mb-0 small pe-md-5">Sourced from the nation&apos;s most reliable industrial plants, specifically graded for local terrain and climate.</p>
      </div>
      <button className="btn btn-sm fw-bold btn-marketplace text-uppercase ls-mid transition-all" onClick={() => navigate('/marketplace')}>View Marketplace</button>
    </div>
    <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      {materials.map((item) => (
        <div key={item.title} className="col">
          <div className="card product-card border-0 shadow-lg rounded-5 h-100 overflow-hidden position-relative">
            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-40 material-image-layer" style={{ backgroundImage: `url(${item.image})` }} />
            <div className="card-body p-4 z-1 position-relative d-flex flex-column justify-content-end material-card-overlay" style={{ minHeight: '260px' }}>
              <h4 className="h6 fw-extra-bold text-white mb-1">{item.title}</h4>
              <div className="small text-white-50 mb-3">{item.subtitle}</div>
              <div className="text-brand fw-bold">{item.price}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const HeroSection = ({ navigate }) => (
  <section className="py-5 text-center text-lg-start">
      <h1 className="display-4 fw-extra-bold mb-3 lh-sm text-dark">
        The <span className="text-brand" style={{ fontWeight: 800 }}>ConMat</span> Shift in <br />
        Pakistan&apos;s Construction Industry
      </h1>
      <div className="badge-hero mb-4 mx-auto mx-lg-0">
        THE FUTURE OF PROCUREMENT
      </div>
      <p className="text-dark fs-5 mb-5 lh-lg max-w-660 mx-auto mx-lg-0">
        Predictive market trends based on industrial output and import data.
      </p>
      <div className="d-flex justify-content-center justify-content-lg-start">
        <button 
          className="btn btn-orange-cta px-4 px-md-5 py-3 fw-bold shadow-lg text-white w-100 w-md-auto" 
          style={{ maxWidth: '320px', fontSize: '1.2rem' }} 
          onClick={() => navigate('/register')}
        >
          Register Yourself
        </button>
      </div>
  </section>
);

const ForecastSection = ({ data }) => (
  <div className="p-4 rounded-4 bg-black-obsidian border border-white-08 shadow-lg">
    <div className="mb-4 text-center">
      <div className="text-orange text-uppercase fw-bold mb-2 small-8 ls-extra">Price Forecast Q4 2024</div>
      <div className="h4 fw-extra-bold text-white mb-1 ls-tight">Predictive market trends based on industrial output and import data </div>
      <div className="text-white-50 small">Industry indicators for Pakistan.</div>
    </div>
    <div className="row row-cols-1 row-cols-lg-3 g-4 text-center">
      {data.map((item) => (
        <div key={item.label} className="col">
          <div className="p-4 h-100 rounded-5 bg-navy border border-white-08 forecast-card d-flex flex-column justify-content-center gap-1 transition-all">
            <div>
              <div className="text-white text-uppercase fw-extra-bold mb-2 small-8 ls-extra">{item.label}</div>
              <div className="h2 fw-extra-bold mb-2 ls-tight text-gradient">{item.value}</div>
            </div>
            <div className="text-white small px-2">{item.note}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CtaBanner = ({ navigate }) => (
  <section className="mt-5 p-4 p-md-5 rounded-4 bg-black-obsidian text-center shadow-lg border border-white-08">
    <div className="text-orange text-uppercase fw-bold mb-2 small-8 ls-extra">Join the Network</div>
    <h2 className="fw-extra-bold text-white mb-3 ls-tight fs-2">Ready to rebuild the backbone of Pakistan?</h2>
    <p className="text-white mb-4 lh-lg max-w-660 mx-auto">Join the digital infrastructure that powers the nation&apos;s progress. Transact in PKR with confidence.</p>
    <div className="d-flex flex-wrap gap-3 mt-2 justify-content-center">
      <button className="btn px-4 py-2 fw-bold shadow-md btn-orange-cta text-white" onClick={() => navigate('/register')}>Create Free Account</button>
      <button className="btn px-4 py-2 fw-bold border border-white-08 btn-navy-cta text-white bg-navy" onClick={() => navigate('/login')}>Talk to an Expert</button>
    </div>
  </section>
);

const Footer = () => {
  const columns = [
    { title: 'Materials', links: ['Steel Grade 60', 'OPC Cement', 'Red Bricks', 'More Materials'] },
    { title: 'Company', links: ['About Us', 'Privacy Policy', 'Terms'] },
    { title: 'Resources', links: ['Price Trends', 'FAQ', 'Contact Us'] }
  ];

  return (
    <footer className="landing-footer row gx-4 gy-4 gx-md-5 py-5 mt-5 border-top border-secondary border-opacity-10 justify-content-between align-items-start">
      <div className="col-12 col-md-5 col-lg-4 mb-4 mb-md-0 text-start">
        <div className="fs-5 fs-md-4 mb-3 d-inline-block text-gradient fw-extra-bold ls-tight">ConMat</div>
        <p className="text-dark small-13 lh-lg mb-0 pe-md-3">Pakistan&apos;s premier industrial marketplace. Digitizing supply chains from the ground up.</p>
      </div>
      {columns.map((col) => (
        <div key={col.title} className="col-6 col-md-3 col-lg-2 text-start">
          <div className="fw-extra-bold text-dark mb-3 small text-uppercase ls-mid">{col.title}</div>
          <div className="d-flex flex-column gap-2">
            {col.links.map(l => <button key={l} className="btn btn-link text-dark p-0 text-start text-decoration-none small-13 hover-brand text-nowrap">{l}</button>)}
          </div>
        </div>
      ))}
      <div className="col-12 mt-5 pt-4 border-top border-secondary border-opacity-10 text-center text-dark small-13 fw-extra-bold">
        © 2026 ConMat. All rights reserved <span className="ms-2">🇵🇰</span>
      </div>
    </footer>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="landing-page min-vh-100">
      <Navbar navigate={navigate} location={location} />
      <div className="app-container px-3 px-md-4">
        <HeroSection navigate={navigate} />
        <FeaturesGrid />
        <div className="my-5">
          <ForecastSection data={priceForecast} />
        </div>
        <MaterialsSection materials={materials} navigate={navigate} />
        <CtaBanner navigate={navigate} />
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
