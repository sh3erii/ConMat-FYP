import { useEffect, useMemo, useState } from 'react';
import { Gavel, Search, Users } from 'lucide-react';
import RoleNavbar from '../../components/common/RoleNavbar';
import { adminService } from '../../services/adminService';
import './AdminBids.css';

const statuses = ['All', 'Open', 'Closed', 'Expired', 'Cancelled'];
const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

export default function AdminBids() {
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminService.getBids()
      .then((response) => {
        if (active) setBids(Array.isArray(response.bids) ? response.bids : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load bid activity.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredBids = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return bids.filter((bid) => {
      if (status !== 'All' && bid.requestStatus !== status) return false;
      if (!keyword) return true;
      return [
        bid.title,
        bid.category,
        bid.city,
        bid.requestReference,
        bid.requester?.name,
        bid.requester?.role,
        ...(bid.participants || []).flatMap((participant) => [participant.name, participant.role]),
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
    });
  }, [bids, search, status]);

  const participantCount = bids.reduce((total, bid) => total + (bid.participants?.length || 0), 0);

  return (
    <>
      <RoleNavbar />
      <main className="admin-bids-page conmat-page-shell">
        <section className="admin-bids-hero conmat-page-hero">
          <div>
            <span>Admin Bid Oversight</span>
            <h1>Bid Requests and Participants</h1>
            <p>See who requested each bulk order and which sellers participated. This section is read-only.</p>
          </div>
          <div className="admin-bids-hero__stats">
            <Gavel aria-hidden="true" />
            <strong>{bids.length}</strong>
            <span>Requests</span>
            <Users aria-hidden="true" />
            <strong>{participantCount}</strong>
            <span>Participants</span>
          </div>
        </section>

        <section className="admin-bids-toolbar" aria-label="Bid filters">
          <label>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requesters or participants"
            />
          </label>
          <select className="conmat-filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Request status">
            {statuses.map((item) => <option key={item} value={item}>{item} Requests</option>)}
          </select>
        </section>

        {loading && <div className="admin-bids-state">Loading bid activity...</div>}
        {error && <div className="admin-bids-state admin-bids-state--error" role="alert">{error}</div>}
        {!loading && !error && !filteredBids.length && <div className="admin-bids-state">No matching bid requests found.</div>}

        {!loading && !error && filteredBids.length > 0 && (
          <section className="admin-bids-table-wrap">
            <table className="admin-bids-table">
              <thead>
                <tr>
                  <th>Bid Request</th>
                  <th>Requested By</th>
                  <th>Quantity / Target</th>
                  <th>Participants</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBids.map((bid) => (
                  <tr key={bid.id}>
                    <td data-label="Bid Request">
                      <strong>{bid.title}</strong>
                      <span>{bid.category || 'Uncategorized'} · {bid.city}</span>
                      <small>Ref {bid.requestReference}</small>
                    </td>
                    <td data-label="Requested By">
                      <strong>{bid.requester?.name || 'Deleted user'}</strong>
                      <span>{bid.requester?.role || 'Requester'} · {bid.requester?.city || 'City not provided'}</span>
                    </td>
                    <td data-label="Quantity / Target">
                      <strong>{bid.requiredQuantity} {bid.unit}</strong>
                      <span>{bid.targetPrice > 0 ? `${money(bid.targetPrice)}/${bid.unit}` : 'No target price'}</span>
                    </td>
                    <td data-label="Participants">
                      {(bid.participants || []).length ? (
                        <div className="admin-bids-participants">
                          {bid.participants.map((participant) => (
                            <div key={participant.offerId}>
                              <strong>{participant.name}</strong>
                              <span>{participant.role} · {money(participant.bidAmount)} · {participant.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span>No participants yet</span>}
                    </td>
                    <td data-label="Status">
                      <span className={`admin-bids-status admin-bids-status--${String(bid.requestStatus).toLowerCase()}`}>
                        {bid.requestStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </>
  );
}
