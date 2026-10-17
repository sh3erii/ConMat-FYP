import { Link } from 'react-router-dom';
import LandingNavbar from '../components/common/LandingNavbar';
import RoleNavbar from '../components/common/RoleNavbar';
import PublicFooter from '../components/common/PublicFooter';
import { useAuth } from '../context/AuthContext';
import './AboutUs.css';

const productCategories = [
  {
    title: 'Cement & Concrete',
    text: 'Find cement, concrete products and essential construction materials from suppliers across the marketplace.'
  },
  {
    title: 'Steel & Metal',
    text: 'Browse construction steel, reinforcement bars and other metal materials for residential and commercial projects.'
  },
  {
    title: 'Bricks & Blocks',
    text: 'Source bricks, blocks and masonry materials in quantities suitable for both retail and wholesale construction.'
  },
  {
    title: 'Sand, Gravel & Aggregates',
    text: 'Compare sand, gravel and aggregate materials from suppliers based on pricing and availability.'
  },
  {
    title: 'Construction Stone',
    text: 'Find stone and other structural construction materials required for foundations, walls and major building work.'
  },
  {
    title: 'Building Materials',
    text: 'Explore essential construction materials required throughout different stages of residential and commercial projects.'
  }
];

const marketplaceFeatures = [
  {
    number: '01',
    title: 'Wholesale & Retail',
    text: 'Buy construction materials whether you need a small quantity for a project or bulk supplies for larger operations.'
  },
  {
    number: '02',
    title: 'Compare Prices',
    text: 'Compare products and supplier pricing in one place instead of relying on scattered local sources.'
  },
  {
    number: '03',
    title: 'Verified Suppliers',
    text: 'Connect with suppliers through a marketplace designed to make sourcing construction materials more reliable.'
  },
  {
    number: '04',
    title: 'Bulk Bidding',
    text: 'Submit bulk requirements and allow suppliers to compete with bids for your construction material needs.'
  }
];

export default function AboutUs() {
  const { user } = useAuth();

  return (
    <>
      {user ? <RoleNavbar /> : <LandingNavbar />}

      <main className="about-page conmat-page-shell">

        {/* HERO */}
        <section className="about-hero conmat-page-hero workspace-hero workspace-hero--detached">
          <div className="about-hero__content workspace-hero__content">
            <span>About Our Marketplace</span>

            <h1>
              Making construction material sourcing
              <em> simpler, smarter and more accessible.</em>
            </h1>

            <p>
              Our platform connects customers, retailers, wholesalers and
              suppliers in one construction marketplace where materials,
              prices and purchasing options can be found in one place.
            </p>
          </div>

          <div className="about-hero__stat workspace-hero__side">
            <strong>Built for Construction</strong>

            <span>
              One marketplace for sourcing materials, comparing prices and
              connecting with suppliers.
            </span>
          </div>
        </section>

        {/* PRODUCTS */}
        <section className="about-section">
          <div className="about-section__container">

            <div className="about-section__heading">
              <span>What You Can Find</span>

              <h2>
                Construction materials for every stage of the project.
              </h2>

              <p>
                From core building materials to essential structural
                products, the marketplace brings construction categories
                together so buyers can source what they need more efficiently.
              </p>
            </div>

            <div className="about-products">
              {productCategories.map((category, index) => (
                <article
                  className="about-product-card"
                  key={category.title}
                >
                  <span className="about-product-card__number">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <h3>{category.title}</h3>

                  <p>{category.text}</p>
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* MARKETPLACE */}
        <section className="about-marketplace">
          <div className="about-marketplace__intro">
            <span>More Than a Product Listing</span>

            <h2>
              A marketplace designed around the way construction
              materials are actually bought.
            </h2>

            <p>
              Whether you are purchasing for a single project or sourcing
              materials in bulk, the platform gives buyers and suppliers
              tools to make the process more efficient.
            </p>
          </div>

          <div className="about-features">
            {marketplaceFeatures.map((feature) => (
              <article
                className="about-feature-card"
                key={feature.number}
              >
                <span>{feature.number}</span>

                <div>
                  <h3>{feature.title}</h3>

                  <p>{feature.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="about-cta">
          <div>
            <span>Start Sourcing</span>

            <h2>
              Find the materials your next project needs.
            </h2>

            <p>
              Browse products, compare available options and connect with
              suppliers through the marketplace.
            </p>
          </div>

          <Link
            to="/marketplace"
            className="about-cta__button"
          >
            Browse Marketplace
          </Link>
        </section>

      </main>
      <PublicFooter />
    </>
  );
}
