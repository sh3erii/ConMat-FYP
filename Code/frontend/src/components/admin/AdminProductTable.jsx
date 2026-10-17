import {
  PackageOpen,
  Eye,
  EyeOff,
  Flag,
  MessageSquareMore,
} from 'lucide-react';
import './AdminProductTable.css';

const statusClass = {
  Visible: 'approved',
  Hidden: 'hidden',
  Rejected: 'rejected',
};

export default function AdminProductTable({
  products = [],
  onStatusChange,
}) {
  if (!products.length) {
    return (
      <div className="admin-product-empty">
        <PackageOpen />
        <h3>No products found</h3>
        <p>
          Try another search keyword, category, city, or status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-product-table-wrap">
      <div className="admin-product-table-head">
        <span>Product</span>
        <span>Seller</span>
        <span>Pricing</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      {products.map((product) => {
        const sellerRole = String(product.sellerRole || '').toLowerCase();
        const isSupplier = sellerRole === 'supplier';
        const isWholesaler = sellerRole === 'wholesaler';
        const hasReports = Number(product.pendingReportCount || 0) > 0;
        const isHidden = product.status === 'Hidden';
        const isRejected = product.status === 'Rejected';
        const shouldUnhide = isHidden || isRejected;
        const stateStatus = shouldUnhide ? 'Approved' : 'Hidden';
        const stateLabel = shouldUnhide ? 'Unhide' : 'Hide';
        const StateIcon = stateStatus === 'Approved' ? Eye : EyeOff;

        return (
        <article className="admin-product-row" key={product.id}>
          <div className="admin-product-main">
            <img src={product.image} alt={product.name} />

            <div>
              <h3>{product.name}</h3>
              <p>
                {product.category} • {product.city}
              </p>
              <small>{product.verificationNote}</small>
              {product.reportCount > 0 && (
                <div className="admin-product-report">
                  <strong><Flag size={14} /> {product.reportCount} report{product.reportCount === 1 ? '' : 's'}</strong>
                  <span>{product.latestReport?.reason}{product.latestReport?.details ? `: ${product.latestReport.details}` : ''}</span>
                  <small>{product.pendingReportCount > 0 ? `${product.pendingReportCount} awaiting review` : 'Reviewed by admin'}</small>
                </div>
              )}
              {product.reviewRequestNote && (
                <div className="admin-product-review-request">
                  <strong>Seller requested another review</strong>
                  <span>{product.reviewRequestNote}</span>
                </div>
              )}
            </div>
          </div>

          <div className="admin-product-seller">
            <strong>{product.sellerName}</strong>
            <span>{product.sellerRole}</span>
          </div>

          <div className="admin-product-pricing">
            <strong>
              {isSupplier ? 'Price' : 'Retail'}: PKR {Number(isSupplier ? product.price : product.retailPrice).toLocaleString()}
            </strong>
            {isWholesaler && (
              <span>Wholesale: PKR {Number(product.wholesalePrice).toLocaleString()}</span>
            )}
            {(isSupplier || isWholesaler) && (
              <span>{isSupplier ? 'Minimum order' : 'Wholesale minimum'}: {Number(product.minWholesaleQty || 1).toLocaleString()} units</span>
            )}
          </div>

          <div>
            <span
              className={`admin-product-status admin-product-status--${
                statusClass[product.status] || 'pending'
              }`}
            >
              {product.status}
            </span>
          </div>

          <div className="admin-product-actions">
            {hasReports && shouldUnhide ? (
              <>
                <button
                  type="button"
                  className="approve"
                  onClick={() => onStatusChange?.(product, 'Approved', { source: 'report' })}
                >
                  <Eye />
                  Unhide
                </button>

                <button
                  type="button"
                  className="review"
                  onClick={() => onStatusChange?.(product, 'Hidden', { source: 'report-info' })}
                >
                  <MessageSquareMore />
                  Request Info from Seller
                </button>
              </>
            ) : hasReports ? (
              <button
                type="button"
                className="hide"
                onClick={() => onStatusChange?.(product, 'Hidden', { source: 'report-hide' })}
              >
                <EyeOff />
                Hide
              </button>
            ) : (
              <button
                type="button"
                className={stateStatus === 'Approved' ? 'approve' : 'hide'}
                onClick={() => onStatusChange?.(product, stateStatus, { source: 'visibility' })}
              >
                <StateIcon />
                {stateLabel}
              </button>
            )}
          </div>
        </article>
        );
      })}
    </div>
  );
}
