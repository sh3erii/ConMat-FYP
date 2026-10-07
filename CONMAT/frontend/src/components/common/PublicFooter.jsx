import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './PublicFooter.css';

const materialsColumn = {
  title: 'Materials',
  links: [
    { label: 'Steel Grade 60', path: '/marketplace?category=Steel' },
    { label: 'OPC Cement', path: '/marketplace?category=Cement' },
    { label: 'Red Bricks', path: '/marketplace?category=Bricks' },
    { label: 'More Materials', path: '/marketplace' },
  ],
};

const companyColumn = {
  title: 'Company',
  links: [
    { label: 'About Us', path: '/about' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms', path: '/terms' },
  ],
};

const resourceLinks = [
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact Us', path: '/contact' },
];

const universalFooterColumns = [
  companyColumn,
  {
    title: 'Resources',
    links: resourceLinks,
  },
];

const landingFooterColumns = [
  materialsColumn,
  companyColumn,
  {
    title: 'Resources',
    links: [
      { label: 'Marketplace Snapshot', path: '/#marketplace-snapshot' },
      ...resourceLinks,
    ],
  },
];

export default function PublicFooter({ fullNavigation = false }) {
  const footerColumns = fullNavigation ? landingFooterColumns : universalFooterColumns;

  return (
    <footer
      className={`public-footer${fullNavigation ? ' public-footer--landing' : ''}`}
      aria-label="ConMat footer"
    >
      <div className="public-footer__grid">
        <div className="public-footer__brand">
          <Link to="/" className="public-footer__wordmark" aria-label="ConMat home">
            <span className="public-footer__wordmark-icon" aria-hidden="true">
              <img src={logo} alt="" />
            </span>
            <span className="public-footer__wordmark-text">ConMat</span>
          </Link>
          <p>
            Pakistan&apos;s construction material marketplace for transparent buying,
            selling and bulk procurement.
          </p>
        </div>

        {footerColumns.map((column) => (
          <nav key={column.title} className="public-footer__column" aria-label={`${column.title} links`}>
            <h2>{column.title}</h2>
            <div className="public-footer__links">
              {column.links.map((item) => (
                <Link key={item.label} to={item.path}>{item.label}</Link>
              ))}
            </div>
          </nav>
        ))}
      </div>

      <div className="public-footer__bottom">
        <span>&copy; 2026 ConMat. All rights reserved.</span>
        <span aria-label="Pakistan">PK</span>
      </div>
    </footer>
  );
}
