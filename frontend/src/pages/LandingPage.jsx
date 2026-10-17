import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Hammer, Lock, BarChart3, UserPlus } from 'lucide-react';

import LandingNavbar from '../components/common/LandingNavbar';
import PublicFooter from '../components/common/PublicFooter';

import cementImg from '../assets/cement.webp';
import steelImg from '../assets/Steel.webp';
import brickImg from '../assets/brick.webp';

import api from '../services/api';
import './LandingPage.css';

/** DATA **/

const featureData = [
  { icon: ShieldCheck, title: 'Verified Suppliers', desc: 'Every vendor is vetted through our detailed verification workflow.', color: 'white', theme: 'trust' },
  { icon: Hammer, title: 'Bulk Bidding', desc: 'Place a request and let suppliers compete for your material order.', color: 'brand', theme: 'glass' },
  { icon: Lock, title: 'Secure Payments', desc: 'Stripe card payments with automatic invoice generation.', color: 'white', theme: 'security' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track price shifts, demand signals, and supplier performance.', color: 'obsidian', theme: 'glass' },
];

/** SUB-COMPONENTS **/

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
            <div className={isWhite ? 'text-dark' : 'text-white'} style={{ fontSize: '1rem', lineHeight: '1.6' }}>{item.desc}</div>
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
        <p className="text-dark mb-0 small pe-md-5">
          Sourced from the nation&apos;s most reliable industrial plants, specifically graded for local terrain and climate.
        </p>
      </div>
      <button type="button" className="btn btn-sm fw-bold btn-marketplace text-uppercase ls-mid transition-all" onClick={() => navigate('/marketplace')}>
        View Marketplace
      </button>
    </div>

    <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      {materials.map((item) => (
        <div key={item.title} className="col">
          <div className="card landing-material-card border-0 shadow-lg rounded-5 h-100 overflow-hidden position-relative">
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
  <section className="landing-hero py-5 text-center text-lg-start">
    <h1 className="display-4 fw-extra-bold mb-3 lh-sm text-dark">
      The <span className="text-brand" style={{ fontWeight: 800 }}>ConMat</span> Shift in <br className="landing-hero__break" />
      Pakistan&apos;s Construction Industry
    </h1>

    <div className="badge-hero mb-4 mx-auto mx-lg-0">THE FUTURE OF PROCUREMENT</div>

    <p className="text-dark fs-5 mb-5 lh-lg max-w-660 mx-auto mx-lg-0">
      Connect with verified sellers, compare construction materials and manage procurement from one marketplace.
    </p>

    <div className="d-flex justify-content-center justify-content-lg-start conmat-hero-actions">
      <button type="button" className="btn btn-orange-cta landing-primary-cta px-4 px-md-5 py-3 fw-bold fs-5 text-white w-100 w-md-auto conmat-hero-action conmat-hero-action--primary" onClick={() => navigate('/register')}>
        <UserPlus />
        Register Yourself
      </button>
    </div>
  </section>
);

const MarketplaceSnapshot = ({ data }) => (
  <div id="marketplace-snapshot" className="p-4 rounded-4 bg-black-obsidian border border-white-08 shadow-lg">
    <div className="mb-4 text-center">
      <div className="text-orange text-uppercase fw-bold mb-2 small-8 ls-extra">Marketplace Snapshot</div>
      <div className="h4 fw-extra-bold text-white mb-1 ls-tight">Current ConMat marketplace activity</div>
      <div className="text-white-50 small">Figures below are calculated from the products currently available through the ConMat API.</div>
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
  <section className="landing-cta-banner mt-5 p-4 p-md-5 rounded-4 bg-black-obsidian text-center shadow-lg border border-white-08">
    <div className="text-orange text-uppercase fw-bold mb-2 small-8 ls-extra">Join the Network</div>
    <h2 className="fw-extra-bold text-white mb-3 ls-tight fs-2">Ready to rebuild the backbone of Pakistan?</h2>
    <p className="text-white mb-4 lh-lg max-w-660 mx-auto">
      Join the digital infrastructure that powers the nation&apos;s progress. Transact in PKR with confidence.
    </p>

    <div className="landing-cta-actions">
      <button type="button" className="btn btn-orange-cta landing-primary-cta text-white" onClick={() => navigate('/register')}>
        Create Free Account
      </button>
      <button type="button" className="btn px-4 py-2 fw-bold border border-white-08 btn-navy-cta btn-secondary-action text-white" onClick={() => navigate('/contact')}>
        Talk to an Expert
      </button>
    </div>
  </section>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.get('/products?sort=price_low')
      .then(({ data }) => {
        if (!cancelled) setProducts(data.products || data.data || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => { cancelled = true; };
  }, []);

  const snapshot = useMemo(() => {
    const sellerCount = new Set(products.map((product) => product.sellerId).filter(Boolean)).size;
    const categoryCount = new Set(products.map((product) => product.category).filter(Boolean)).size;
    return [
      { label: 'Live Listings', value: products.length, note: 'Products currently visible from approved sellers.' },
      { label: 'Verified Sellers', value: sellerCount, note: 'Distinct verified sellers represented in the live catalog.' },
      { label: 'Material Categories', value: categoryCount, note: 'Construction material categories currently available.' },
    ];
  }, [products]);

  const featuredMaterials = useMemo(() => products.slice(0, 3).map((product) => {
    const category = String(product.category || '').toLowerCase();
    const fallbackImage = category.includes('steel') ? steelImg : category.includes('brick') ? brickImg : cementImg;
    return {
      title: product.name,
      subtitle: `${product.sellerName || product.seller?.name || 'Verified seller'} · ${product.city || 'Pakistan'}`,
      price: `${formatPrice(product.retailPrice)} / ${product.unit || 'unit'}`,
      image: product.imageUrl || product.image || fallbackImage,
    };
  }), [products]);

  return (
    <div className="landing-page min-vh-100">
      <LandingNavbar />
      <div className="app-container px-3 px-md-4">
        <HeroSection navigate={navigate} />
        <FeaturesGrid />
        <div className="my-5"><MarketplaceSnapshot data={snapshot} /></div>
        {featuredMaterials.length > 0 && <MaterialsSection materials={featuredMaterials} navigate={navigate} />}
        <CtaBanner navigate={navigate} />
      <PublicFooter fullNavigation />
      </div>
    </div>
  );
};

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
};

export default LandingPage;
