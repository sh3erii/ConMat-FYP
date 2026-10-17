import { ClipboardList, FilePlus2, Gavel } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import RoleNavbar from '../../components/common/RoleNavbar';
import { useAuth } from '../../context/AuthContext';
import { bulkRequesterRoles, getUserRole, isUserVerified } from '../../config/navigation';
import SupplierBidsPage from '../supplier/SupplierBidsPage';
import BulkOrderRequest from './BulkOrderRequest';
import './BidsWorkspace.css';

const tabDefinitions = {
  create: { label: 'Create Bulk Request', icon: FilePlus2 },
  requests: { label: 'My Requests & Bids', icon: ClipboardList },
  opportunities: { label: 'Bid Opportunities', icon: Gavel },
};

export default function BidsWorkspace() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const role = getUserRole(user);
  const canCreateRequests = bulkRequesterRoles.includes(role);
  const canViewOpportunities = role === 'retailer'
    || role === 'supplier'
    || (role === 'wholesaler' && isUserVerified(user));

  const availableViews = [
    ...(canCreateRequests ? ['create', 'requests'] : []),
    ...(canViewOpportunities ? ['opportunities'] : []),
  ];
  const requestedView = searchParams.get('view');
  const activeView = availableViews.includes(requestedView)
    ? requestedView
    : availableViews[0] || 'requests';

  return (
    <>
      <RoleNavbar />

      {role !== 'supplier' && (
        <div className="bids-workspace-nav-shell conmat-page-shell">
          <nav className="bids-workspace-nav" aria-label="Bids workspace">
            {availableViews.map((view) => {
              const tab = tabDefinitions[view];
              const Icon = tab.icon;
              return (
                <Link
                  key={view}
                  to={`/bids?view=${view}`}
                  className={activeView === view ? 'is-active' : ''}
                  aria-current={activeView === view ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {activeView === 'create' && <BulkOrderRequest embedded />}
      {activeView === 'requests' && (
        <SupplierBidsPage
          key="buyer-requests"
          embedded
          readOnly
          eyebrow="Buyer Workspace"
          title="Bids on Your Requests"
          description="Review supplier offers on your bulk procurement requests and open a request to compare bids."
        />
      )}
      {activeView === 'opportunities' && (
        <SupplierBidsPage
          key={`bid-opportunities-${role}`}
          embedded
          observer={role === 'retailer'}
          eyebrow={role === 'retailer' ? 'Retailer View' : undefined}
          title={role === 'retailer' ? 'Bulk Bid Activity' : undefined}
          description={role === 'retailer'
            ? 'View active bulk-order requests, their requesters and the sellers currently participating.'
            : undefined}
        />
      )}
    </>
  );
}
