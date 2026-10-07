import { ExternalLink, FileText } from 'lucide-react';
import './SellerVerificationCard.css';

export default function SellerVerificationCard({ seller, onApprove, onReject }) {
  return (
    <article className="seller-verification-card">
      <div className="seller-verification-card__top">
        <div>
          <span>{seller.role} Application</span>
          <h3>{seller.businessName}</h3>
          <p>{seller.ownerName} • {seller.city}</p>
        </div>
        <strong className={`seller-risk seller-risk--${seller.riskLevel.toLowerCase()}`}>{seller.riskLevel} Risk</strong>
      </div>

      <div className="seller-verification-card__body">
        <p><b>Email:</b> {seller.email}</p>
        <p><b>Phone:</b> {seller.phone}</p>
        <p><b>Material Focus:</b> {seller.materialFocus}</p>
        <p><b>Submitted:</b> {seller.submittedAt}</p>
      </div>

      <section className="seller-documents" aria-label={`Verification documents for ${seller.ownerName}`}>
        <h4>Verification documents</h4>
        {seller.documents?.length ? (
          <div className="seller-documents__grid">
            {seller.documents.map((document) => {
              const isPdf = /\.pdf(?:$|[?#])/i.test(document.url);
              return (
                <article className="seller-document" key={document.key}>
                  <a className="seller-document__preview" href={document.url} target="_blank" rel="noreferrer">
                    {isPdf ? (
                      <FileText size={42} aria-hidden="true" />
                    ) : (
                      <img src={document.url} alt={`${document.label} submitted by ${seller.ownerName}`} loading="lazy" />
                    )}
                  </a>
                  <div className="seller-document__footer">
                    <strong>{document.label}</strong>
                    <a href={document.url} target="_blank" rel="noreferrer">
                      View full <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="seller-documents__empty">No verification documents were submitted.</p>
        )}
      </section>

      <div className="seller-verification-card__actions">
        <button type="button" className="btn btn-light" onClick={() => onReject(seller)}>Reject</button>
        <button type="button" className="btn btn-orange-cta seller-verification-card__approve" onClick={() => onApprove(seller)}>Approve Seller</button>
      </div>
    </article>
  );
}
