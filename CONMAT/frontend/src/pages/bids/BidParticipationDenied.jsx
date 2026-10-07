import { ArrowLeft, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import RoleNavbar from '../../components/common/RoleNavbar';
import './BidParticipationDenied.css';

export default function BidParticipationDenied() {
  return (
    <>
      <RoleNavbar />
      <main className="bid-participation-denied-page conmat-page-shell">
        <section className="bid-participation-denied-card" role="status">
          <span className="bid-participation-denied-card__icon"><ShieldX size={34} aria-hidden="true" /></span>
          <span className="bid-participation-denied-card__eyebrow">Retailer access</span>
          <h1>You are not allowed to participate in bids.</h1>
          <p>
            Retailers can view bulk-order requests and see who is participating,
            but only eligible suppliers and wholesalers can submit bid offers.
          </p>
          <Link to="/bids?view=opportunities">
            <ArrowLeft size={17} aria-hidden="true" />
            Back to Bids
          </Link>
        </section>
      </main>
    </>
  );
}
