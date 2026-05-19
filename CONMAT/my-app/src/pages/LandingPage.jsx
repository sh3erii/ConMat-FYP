// ============================================================
//  src/pages/LandingPage.jsx  (Talha Tariq – 077019)
//  ConMat Landing Page
//  Theme: dark navy left panel + white right | accent #B45309
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Inline styles (no external CSS file needed) ──────────────
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'Segoe UI', Arial, sans-serif"
  },

  // ── LEFT PANEL ──────────────────────────────────────────────
  left: {
    width: '42%',
    background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #1a2744 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px 40px',
    position: 'relative',
    overflow: 'hidden'
  },
  leftBgCircle1: {
    position: 'absolute', top: '-80px', left: '-80px',
    width: '300px', height: '300px', borderRadius: '50%',
    background: 'rgba(180,83,9,0.08)', pointerEvents: 'none'
  },
  leftBgCircle2: {
    position: 'absolute', bottom: '-60px', right: '-60px',
    width: '250px', height: '250px', borderRadius: '50%',
    background: 'rgba(180,83,9,0.06)', pointerEvents: 'none'
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1
  },
  logoIcon: {
    width: '44px', height: '44px',
    background: 'linear-gradient(135deg,#b45309,#f97316)',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', fontWeight: 900, color: '#fff'
  },
  logoText: {
    fontSize: '26px', fontWeight: 800,
    color: '#fff', letterSpacing: '-0.5px'
  },
  logoSub: {
    fontSize: '11px', color: '#94a3b8',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px'
  },
  heroSection: {
    zIndex: 1
  },
  heroTag: {
    display: 'inline-block',
    background: 'rgba(180,83,9,0.18)',
    color: '#fb923c',
    fontSize: '11px', fontWeight: 700,
    letterSpacing: '1.5px', textTransform: 'uppercase',
    padding: '5px 14px', borderRadius: '20px',
    border: '1px solid rgba(180,83,9,0.3)',
    marginBottom: '20px'
  },
  heroTitle: {
    fontSize: '38px', fontWeight: 800,
    color: '#fff', lineHeight: 1.15,
    marginBottom: '16px'
  },
  heroAccent: {
    color: '#f97316'
  },
  heroDesc: {
    fontSize: '15px', color: '#94a3b8',
    lineHeight: 1.7, marginBottom: '32px'
  },
  statsRow: {
    display: 'flex', gap: '28px', flexWrap: 'wrap'
  },
  statItem: {
    display: 'flex', flexDirection: 'column'
  },
  statNum: {
    fontSize: '24px', fontWeight: 800, color: '#f97316'
  },
  statLabel: {
    fontSize: '11px', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px'
  },
  leftFooter: {
    zIndex: 1
  },
  roleChips: {
    display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px'
  },
  chip: {
    fontSize: '11px', fontWeight: 600,
    color: '#94a3b8', border: '1px solid #334155',
    borderRadius: '20px', padding: '4px 12px',
    background: 'rgba(255,255,255,0.03)'
  },
  leftNote: {
    fontSize: '12px', color: '#475569'
  },

  // ── RIGHT PANEL ─────────────────────────────────────────────
  right: {
    flex: 1,
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  rightTop: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    padding: '24px 40px 0'
  },
  rightTopLink: {
    fontSize: '14px', color: '#64748b', marginRight: '20px',
    textDecoration: 'none', cursor: 'pointer'
  },
  rightContent: {
    flex: 1, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', padding: '40px'
  },
  sectionLabel: {
    fontSize: '11px', fontWeight: 700,
    color: '#b45309', letterSpacing: '2px',
    textTransform: 'uppercase', marginBottom: '8px'
  },
  sectionTitle: {
    fontSize: '30px', fontWeight: 800,
    color: '#0f172a', marginBottom: '8px', lineHeight: 1.2
  },
  sectionDesc: {
    fontSize: '14px', color: '#64748b',
    marginBottom: '32px', lineHeight: 1.6
  },

  // ── Feature cards ────────────────────────────────────────────
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '36px'
  },
  card: {
    background: '#fff',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    cursor: 'default',
    transition: 'box-shadow 0.2s, transform 0.2s'
  },
  cardIconWrap: {
    width: '40px', height: '40px',
    background: 'linear-gradient(135deg,#fff7ed,#ffedd5)',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', marginBottom: '12px'
  },
  cardTitle: {
    fontSize: '14px', fontWeight: 700,
    color: '#1e293b', marginBottom: '4px'
  },
  cardDesc: {
    fontSize: '12px', color: '#94a3b8', lineHeight: 1.5
  },

  // ── CTA buttons ──────────────────────────────────────────────
  ctaRow: {
    display: 'flex', gap: '12px', flexWrap: 'wrap'
  },
  btnPrimary: {
    background: 'linear-gradient(135deg,#b45309,#f97316)',
    color: '#fff', border: 'none',
    padding: '13px 28px', borderRadius: '10px',
    fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', transition: 'opacity 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  btnSecondary: {
    background: '#fff', color: '#1e293b',
    border: '1.5px solid #e2e8f0',
    padding: '13px 28px', borderRadius: '10px',
    fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', transition: 'border-color 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px'
  },

  // ── Platforms comparison strip ───────────────────────────────
  compareStrip: {
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    padding: '20px 40px',
    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
  },
  compareLabel: {
    fontSize: '12px', color: '#94a3b8', fontWeight: 600
  },
  compareBadge: {
    fontSize: '12px', color: '#64748b',
    background: '#f1f5f9', borderRadius: '6px',
    padding: '4px 10px'
  },
  compareBadgeUs: {
    fontSize: '12px', color: '#fff',
    background: 'linear-gradient(135deg,#b45309,#f97316)',
    borderRadius: '6px', padding: '4px 10px', fontWeight: 700
  },

  // ── Navbar (top of right) ────────────────────────────────────
  navLink: {
    fontSize: '13px', color: '#64748b',
    cursor: 'pointer', fontWeight: 500,
    padding: '6px 12px', borderRadius: '8px',
    border: 'none', background: 'transparent',
    transition: 'color 0.2s'
  }
};

// ── Feature data ─────────────────────────────────────────────
const features = [
  { icon: '🏗️', title: 'Verified Suppliers', desc: 'Admin-verified sellers only. Zero fraud risk on every transaction.' },
  { icon: '⚖️', title: 'Wholesale & Retail', desc: 'Both pricing models on one platform. Compare prices instantly.' },
  { icon: '📦', title: 'Bulk Bidding', desc: 'Submit bulk requests and let suppliers compete for your order.' },
  { icon: '🔒', title: 'Secure Payments', desc: 'Stripe-powered payments with auto PDF invoice generation.' }
];

// ── Role chips ───────────────────────────────────────────────
const roles = ['Admin', 'Supplier', 'Wholesaler', 'Retailer', 'Customer'];

// ============================================================
const LandingPage = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div style={S.page}>

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div style={S.left}>
        <div style={S.leftBgCircle1} />
        <div style={S.leftBgCircle2} />

        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoIcon}>C</div>
          <div>
            <div style={S.logoText}>ConMat</div>
            <div style={S.logoSub}>Construction Marketplace</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={S.heroSection}>
          <div style={S.heroTag}>🇵🇰 Pakistan's First Unified Platform</div>
          <h1 style={S.heroTitle}>
            Buy & Sell<br />
            <span style={S.heroAccent}>Construction</span><br />
            Materials Online
          </h1>
          <p style={S.heroDesc}>
            Connect directly with verified suppliers, compare wholesale
            and retail prices, place orders and track them — all in one place.
            No more calling vendors manually.
          </p>
          <div style={S.statsRow}>
            <div style={S.statItem}>
              <span style={S.statNum}>5</span>
              <span style={S.statLabel}>User Roles</span>
            </div>
            <div style={S.statItem}>
              <span style={S.statNum}>100%</span>
              <span style={S.statLabel}>Verified Sellers</span>
            </div>
            <div style={S.statItem}>
              <span style={S.statNum}>Stripe</span>
              <span style={S.statLabel}>Secure Payments</span>
            </div>
          </div>
        </div>

        {/* Bottom: role chips + note */}
        <div style={S.leftFooter}>
          <div style={S.roleChips}>
            {roles.map(r => (
              <span key={r} style={S.chip}>{r}</span>
            ))}
          </div>
          <div style={S.leftNote}>
            Govt. Islamia Graduate College, Gujranwala · BSIT 2022–2026
          </div>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL ═══════════ */}
      <div style={S.right}>

        {/* Top navbar */}
        <div style={S.rightTop}>
          <button style={S.navLink} onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button
            style={S.btnPrimary}
            onClick={() => navigate('/register')}
          >
            Get Started →
          </button>
        </div>

        {/* Main content */}
        <div style={S.rightContent}>
          <div style={S.sectionLabel}>Why ConMat?</div>
          <h2 style={S.sectionTitle}>
            Everything you need in<br />one marketplace
          </h2>
          <p style={S.sectionDesc}>
            From cement to steel — browse products, compare bids,
            pay securely and get digital invoices instantly.
          </p>

          {/* Feature cards */}
          <div style={S.cardsGrid}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  ...S.card,
                  boxShadow: hoveredCard === i ? '0 8px 30px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                  transform:  hoveredCard === i ? 'translateY(-3px)' : 'none'
                }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={S.cardIconWrap}>{f.icon}</div>
                <div style={S.cardTitle}>{f.title}</div>
                <div style={S.cardDesc}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={S.ctaRow}>
            <button
              style={S.btnPrimary}
              onClick={() => navigate('/register')}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              🚀 Create Free Account
            </button>
            <button
              style={S.btnSecondary}
              onClick={() => navigate('/login')}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#b45309'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              🔑 Sign In
            </button>
          </div>
        </div>

        {/* Comparison strip */}
        <div style={S.compareStrip}>
          <span style={S.compareLabel}>vs. existing platforms:</span>
          <span style={S.compareBadge}>Zarea.pk – wholesale only</span>
          <span style={S.compareBadge}>Home Point – retail only</span>
          <span style={S.compareBadge}>Alibaba – not localized</span>
          <span style={S.compareBadgeUs}>ConMat – both ✓ bidding ✓ verified ✓</span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
