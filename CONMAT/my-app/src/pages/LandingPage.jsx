import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const S = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    color: '#0f172a',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    overflowX: 'hidden'
  },
  container: {
    maxWidth: '1320px',
    margin: '0 auto',
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '60px'
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    padding: '8px',
    cursor: 'pointer',
    color: '#475569'
  },
  brandMark: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg,#f97316,#b45309)',
    boxShadow: '0 16px 45px rgba(249,115,22,.2)',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: '18px'
  },
  brandText: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '-0.6px',
    color: '#111827'
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '28px'
  },
  navLink: {
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s'
  },
  navLinkActive: {
    color: '#f97316'
  },
  buttonPressed: {
    transform: 'translateY(2px)',
    opacity: 0.95,
    boxShadow: 'none'
  },
  navButton: {
    borderRadius: '18px',
    border: 'none',
    padding: '10px 24px',
    fontSize: '13px',
    color: '#fff',
    background: '#f97316',
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.2s'
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '32px',
    alignItems: 'center'
  },
  heroIntro: {
    maxWidth: '660px'
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    color: '#b45309',
    background: 'rgba(254, 215, 170, 0.35)',
    padding: '12px 18px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '24px'
  },
  heroTitle: {
    fontSize: '56px',
    lineHeight: 1.03,
    fontWeight: 800,
    marginBottom: '24px',
    color: '#111827'
  },
  heroAccent: {
    color: '#f97316'
  },
  heroText: {
    fontSize: '17px',
    lineHeight: 1.9,
    color: '#475569',
    marginBottom: '32px'
  },
  heroCtas: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  primaryButton: {
    background: '#c2410c',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 28px rgba(194,65,12,0.20)'
  },
  secondaryButton: {
    background: '#1d4ed8',
    color: '#fff',
    border: '1px solid rgba(29,78,216,0.24)',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  heroVisual: {
    position: 'relative',
    minHeight: '540px',
    borderRadius: '38px',
    overflow: 'hidden',
    background: '#f8fafc',
    padding: '32px',
    boxShadow: '0 30px 80px rgba(15,23,42,0.12)'
  },
  heroVisualImage: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.18,
    filter: 'grayscale(70%)'
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.95))'
  },
  heroStatsCard: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minHeight: '420px',
    borderRadius: '30px',
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '34px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  heroStatTag: {
    fontSize: '13px',
    letterSpacing: '1.4px',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: '26px'
  },
  heroStatTitle: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '18px'
  },
  heroMiniStats: {
    display: 'grid',
    gap: '14px'
  },
  heroMiniItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.04)'
  },
  heroMiniKey: {
    color: '#cbd5e1',
    fontSize: '13px'
  },
  heroMiniValue: {
    fontWeight: 700,
    color: '#fff'
  },
  featuresSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
    gap: '20px'
  },
  featureCard: {
    borderRadius: '24px',
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '26px',
    minHeight: '160px',
    transition: 'transform 0.25s, box-shadow 0.25s',
    cursor: 'pointer'
  },
  featureIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '16px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(249,115,22,0.16)',
    color: '#f97316',
    fontSize: '20px',
    marginBottom: '18px'
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '10px'
  },
  featureDesc: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: 1.75
  },
  forecastSection: {
    display: 'grid',
    gap: '24px',
    background: '#020203',
    padding: '32px',
    borderRadius: '28px'
  },
  forecastHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px'
  },
  forecastTag: {
    color: '#f97316',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1.6px',
    fontWeight: 700
  },
  forecastTitle: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#fff'
  },
  forecastDesc: {
    color: '#94a3b8',
    maxWidth: '660px',
    lineHeight: 1.8,
    marginTop: '8px'
  },
  forecastGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
    gap: '18px'
  },
  forecastCard: {
    borderRadius: '28px',
    padding: '26px',
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  forecastTagSmall: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '14px'
  },
  forecastValue: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '10px'
  },
  forecastNote: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: 1.75
  },
  materialsSection: {
    display: 'grid',
    gap: '22px'
  },
  materialsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
  },
  materialsTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#020203'
  },
  materialsLink: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#f97316',
    background: 'rgba(249,115,22,0.08)',
    borderRadius: '18px',
    padding: '10px 18px',
    border: '1px solid rgba(249,115,22,0.18)',
    cursor: 'pointer'
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
    gap: '20px'
  },
  productCard: {
    borderRadius: '30px',
    overflow: 'hidden',
    background: '#111827',
    boxShadow: '0 24px 60px rgba(0,0,0,0.20)',
    display: 'flex',
    flexDirection: 'column'
  },
  productImage: {
    minHeight: '260px',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  },
  productInfo: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  productName: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff'
  },
  productMeta: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  productPrice: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#f97316'
  },
  ctaBanner: {
    borderRadius: '32px',
    background: '#020203',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    minHeight: '220px'
  },
  ctaBannerText: {
    color: '#fff'
  },
  ctaBannerTitle: {
    fontSize: '30px',
    fontWeight: 800,
    marginBottom: '14px'
  },
  ctaBannerDesc: {
    color: '#cbd5e1',
    lineHeight: 1.8
  },
  ctaBannerButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    justifyContent: 'center',
    alignItems: 'center'
  },
  ctaPrimaryButton: {
    background: '#c2410c',
    color: '#fff',
    border: 'none',
    padding: '14px 30px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 34px rgba(194,65,12,0.20)'
  },
  ctaSecondaryButton: {
    background: '#0f172a',
    color: '#e6eef8',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '14px 30px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: '1.4fr repeat(3, 1fr)',
    gap: '30px',
    padding: '36px 0',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  footerBrand: {
    color: '#f97316',
    fontWeight: 800,
    letterSpacing: '0.4px',
    marginBottom: '18px'
  },
  footerText: {
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.9
  },
  footerColumnTitle: {
    color: '#020203',
    fontWeight: 800,
    fontSize: '15px',
    marginBottom: '14px'
  },
  footerLink: {
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 2,
    cursor: 'pointer'
  }
};

const featureData = [
  { icon: '🛡️', title: 'Verified Suppliers', desc: 'Every vendor is vetted through our detailed verification workflow.' },
  { icon:'🔨'
    , title: 'Bulk Bidding', desc: 'Place a request and let suppliers compete for your material order.' },
  { icon: '🔒', title: 'Secure Payments', desc: 'Escrow-style fund release with instant invoice generation.' },
  { icon: '📊', title: 'Real-time Analytics', desc: 'Track price shifts, demand signals, and supplier performance.' }
];

const priceForecast = [
  { label: 'Steel (Grade 60)', value: '+5.2%', note: 'Higher demand after recent cement orders.' },
  { label: 'Cement (OPC)', value: '−0.8%', note: 'Local supply stabilized and freight costs eased.' },
  { label: 'Bricks (A-Grade)', value: '+2.5%', note: 'Seasonal demand remains steady in urban projects.' }
];

const materials = [
  { title: 'OPC Cement', subtitle: 'Ordinary Portland Cement', price: 'PKR 1,240/bag', image: 'https://images.unsplash.com/photo-1581094078250-3b94d1a3009f?auto=format&fit=crop&w=900&q=80' },
  { title: 'Grade 60 Steel', subtitle: 'Deformed Bars', price: 'PKR 265/kg', image: 'https://images.unsplash.com/photo-1596495577886-d920f5a68f08?auto=format&fit=crop&w=900&q=80' },
  { title: 'Red Bricks', subtitle: 'First-Class A-Grade', price: 'PKR 18.5/1k', image: 'https://images.unsplash.com/photo-1504222490345-289bb1aff0d0?auto=format&fit=crop&w=900&q=80' }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [pressedButton, setPressedButton] = useState(null);
  const [navHover, setNavHover] = useState(null);

  return (
    <div style={S.page}>
      <div style={S.container}>
        <header style={S.nav}>
          <div style={S.brand}>
            <div style={{...S.footerBrand, marginBottom: 0}}>ConMat</div>
          </div>
          <div style={S.navLinks}>
            <button
              style={{...S.navLink, ...((location.pathname === '/marketplace' || navHover === '/marketplace') ? S.navLinkActive : {}), ...(pressedButton === '/marketplace' ? S.buttonPressed : {})}}
              onClick={() => { navigate('/marketplace'); setNavHover(null); }}
              onMouseDown={() => setPressedButton('/marketplace')}
              onMouseUp={() => setPressedButton(null)}
              onMouseEnter={() => setNavHover('/marketplace')}
              onMouseLeave={() => { setNavHover(null); setPressedButton(null); }}
              onFocus={() => setNavHover('/marketplace')}
              onBlur={() => setNavHover(null)}
              onTouchStart={() => setNavHover('/marketplace')}
              onTouchEnd={() => setNavHover(null)}
            >Marketplace</button>
            <button
              style={{...S.navLink, ...((location.pathname === '/analytics' || navHover === '/analytics') ? S.navLinkActive : {}), ...(pressedButton === '/analytics' ? S.buttonPressed : {})}}
              onClick={() => { navigate('/analytics'); setNavHover(null); }}
              onMouseDown={() => setPressedButton('/analytics')}
              onMouseUp={() => setPressedButton(null)}
              onMouseEnter={() => setNavHover('/analytics')}
              onMouseLeave={() => { setNavHover(null); setPressedButton(null); }}
              onFocus={() => setNavHover('/analytics')}
              onBlur={() => setNavHover(null)}
              onTouchStart={() => setNavHover('/analytics')}
              onTouchEnd={() => setNavHover(null)}
            >Analytics</button>
            <button
              style={{...S.navLink, ...((location.pathname === '/reports' || navHover === '/reports') ? S.navLinkActive : {}), ...(pressedButton === '/reports' ? S.buttonPressed : {})}}
              onClick={() => { navigate('/reports'); setNavHover(null); }}
              onMouseDown={() => setPressedButton('/reports')}
              onMouseUp={() => setPressedButton(null)}
              onMouseEnter={() => setNavHover('/reports')}
              onMouseLeave={() => { setNavHover(null); setPressedButton(null); }}
              onFocus={() => setNavHover('/reports')}
              onBlur={() => setNavHover(null)}
              onTouchStart={() => setNavHover('/reports')}
              onTouchEnd={() => setNavHover(null)}
            >Reports</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <button style={S.iconButton} aria-label="Notifications">🔔</button>
            <button style={S.iconButton} aria-label="Settings">⚙️</button>
            <button
              style={{...S.navButton, ...(pressedButton === '/register' ? S.buttonPressed : {})}}
              onClick={() => navigate('/register')}
              onMouseDown={() => setPressedButton('/register')}
              onMouseUp={() => setPressedButton(null)}
              onMouseLeave={() => setPressedButton(null)}
            >Sign Up</button>
          </div>
        </header>

        <section style={S.hero}>
          <div style={S.heroIntro}>
            <div style={S.heroBadge}>THE FUTURE OF PROCUREMENT</div>
            <h1 style={S.heroTitle}>
              The <span style={S.heroAccent}>ConMat</span><br />
              Shift in Pakistan&apos;s<br />
              Construction Industry
            </h1>
            <p style={S.heroText}>
              Connecting verified suppliers, wholesalers, and retailers for a more transparent future.
            </p>
            <div style={S.heroCtas}>
              <button
                style={{...S.primaryButton, ...(pressedButton === 'start-sourcing' ? S.buttonPressed : {})}}
                onClick={() => navigate('/marketplace')}
                onMouseDown={() => setPressedButton('start-sourcing')}
                onMouseUp={() => setPressedButton(null)}
                onMouseLeave={() => setPressedButton(null)}
              >Start Sourcing</button>
              <button
                style={{...S.secondaryButton, ...(pressedButton === 'register-supplier' ? S.buttonPressed : {})}}
                onClick={() => navigate('/register')}
                onMouseDown={() => setPressedButton('register-supplier')}
                onMouseUp={() => setPressedButton(null)}
                onMouseLeave={() => setPressedButton(null)}
              >Register as Supplier</button>
            </div>
          </div>

        </section>

        <section style={S.featuresSection}>
          {featureData.map((item, index) => {
            const isWhite = item.title === 'Verified Suppliers' || item.title === 'Secure Payments';
            const isOrange = item.title === 'Bulk Bidding';
            const isAnalytic = item.title === 'Real-time Analytics';
            return (
              <div
                key={item.title}
                style={{
                  ...S.featureCard,
                  background: isWhite ? '#ffffff' : isOrange ? '#d97706' : isAnalytic ? '#1e3a8a' : '#0f172a',
                  border: isWhite ? '1px solid rgba(15,23,42,0.08)' : isOrange ? '1px solid rgba(217,119,6,0.24)' : isAnalytic ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.08)',
                  transform: hoveredFeature === index ? 'translateY(-6px)' : 'none',
                  boxShadow: hoveredFeature === index ? '0 26px 60px rgba(0,0,0,0.20)' : '0 0 0 rgba(0,0,0,0)'
                }}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div
                  style={{
                    ...S.featureIcon,
                    background: isWhite ? '#fef3c7' : isOrange ? '#fbe7c6' : isAnalytic ? '#274be0' : '#1e3a8a',
                    color: isWhite ? '#b45309' : isOrange ? '#b45309' : isAnalytic ? '#ffffff' : '#fff'
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ ...S.featureTitle, color: isWhite ? '#111827' : '#fff' }}>{item.title}</div>
                <div style={{ ...S.featureDesc, color: isWhite ? '#475569' : isAnalytic ? '#dbeafe' : isOrange ? '#fff' : '#cbd5e1' }}>{item.desc}</div>
              </div>
            );
          })}
        </section>

        <section style={S.forecastSection}>
          <div style={S.forecastHeader}>
            <div>
              <div style={S.forecastTag}>Price Forecast Q4 2024</div>
              <div style={S.forecastTitle}>Predictive market trends based on industrial output and import data.</div>
              <div style={S.forecastDesc}>Industry indicators for steel, cement, and bricks in Pakistan.</div>
            </div>
          </div>
          <div style={S.forecastGrid}>
            {priceForecast.map((item) => (
              <div key={item.label} style={S.forecastCard}>
                <div style={S.forecastTagSmall}>{item.label}</div>
                <div style={S.forecastValue}>{item.value}</div>
                <div style={S.forecastNote}>{item.note}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={S.materialsSection}>
          <div style={S.materialsHeader}>
            <div>
              <div style={S.materialsTitle}>Materials</div>
              <div style={S.heroText}>Sourced from the nation&apos;s most reliable industrial plants, specifically graded for local terrain and climate.</div>
            </div>
            <button
              style={{...S.materialsLink, ...(pressedButton === 'view-marketplace' ? S.buttonPressed : {})}}
              onClick={() => navigate('/marketplace')}
              onMouseDown={() => setPressedButton('view-marketplace')}
              onMouseUp={() => setPressedButton(null)}
              onMouseLeave={() => setPressedButton(null)}
            >View Marketplace</button>
          </div>
          <div style={S.productGrid}>
            {materials.map((item) => (
              <div key={item.title} style={S.productCard}>
                <div style={{ ...S.productImage, backgroundImage: `url(${item.image})` }} />
                <div style={S.productInfo}>
                  <div style={S.productName}>{item.title}</div>
                  <div style={S.productMeta}>{item.subtitle}</div>
                  <div style={S.productPrice}>{item.price}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={S.ctaBanner}>
          <div style={S.ctaBannerText}>
            <div style={S.ctaBannerTitle}>Ready to rebuild the backbone of Pakistan?</div>
            <div style={S.ctaBannerDesc}>Join the digital infrastructure that powers the nation&apos;s progress. Transact in PKR with confidence.</div>
          </div>
          <div style={S.ctaBannerButtons}>
            <button
              style={{...S.ctaPrimaryButton, ...(pressedButton === 'create-account' ? S.buttonPressed : {})}}
              onClick={() => navigate('/register')}
              onMouseDown={() => setPressedButton('create-account')}
              onMouseUp={() => setPressedButton(null)}
              onMouseLeave={() => setPressedButton(null)}
            >Create Free Account</button>
            <button
              style={{...S.ctaSecondaryButton, ...(pressedButton === 'talk-expert' ? S.buttonPressed : {})}}
              onClick={() => navigate('/login')}
              onMouseDown={() => setPressedButton('talk-expert')}
              onMouseUp={() => setPressedButton(null)}
              onMouseLeave={() => setPressedButton(null)}
            >Talk to an Expert</button>
          </div>
        </section>

        <footer style={S.footer}>
          <div>
            <div style={S.footerBrand}>ConMat</div>
            <div style={S.footerText}>Pakistan&apos;s premier industrial procurement marketplace. Digitizing supply chains from the ground up.</div>
          </div>
          <div>
            <div style={S.footerColumnTitle}>Materials</div>
            <div style={S.footerLink}>Steel Grade 60</div>
            <div style={S.footerLink}>OPC Cement</div>
            <div style={S.footerLink}>Red Bricks</div>
          </div>
          <div>
            <div style={S.footerColumnTitle}>Company</div>
            <div style={S.footerLink}>About Us</div>
            <div style={S.footerLink}>Privacy Policy</div>
            <div style={S.footerLink}>Terms of Service</div>
          </div>
          <div>
            <div style={S.footerColumnTitle}>Resources</div>
            <div style={S.footerLink}>Price Trends</div>
            <div style={S.footerLink}>Supplier FAQ</div>
            <div style={S.footerLink}>Contact Us</div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
