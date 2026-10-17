import { useEffect, useMemo, useState } from 'react';
import RoleNavbar from '../../components/common/RoleNavbar';
import SellerVerificationCard from '../../components/admin/SellerVerificationCard';
import { adminService } from '../../services/adminService';
import './SellerVerification.css';

export default function SellerVerification() {
  const [applications, setApplications] = useState([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      try {
        const response = await adminService.getSellerApplications('Pending');
        if (active) setApplications(response.applications || []);
      } catch (error) {
        if (active) setNotice(error.response?.data?.message || 'Unable to load pending verifications.');
      }
    }

    loadApplications();
    return () => { active = false; };
  }, []);

  const visibleApplications = useMemo(() => {
    const search = query.toLowerCase();
    return applications.filter((seller) => {
      const matchesSearch = !search || `${seller.businessName} ${seller.ownerName} ${seller.city} ${seller.materialFocus}`.toLowerCase().includes(search);
      return matchesSearch;
    });
  }, [applications, query]);

  const approveSeller = async (seller) => {
    try {
      await adminService.approveSeller(seller.id, 'Documents verified by admin.');
      setApplications((items) => items.filter((item) => item.id !== seller.id));
      setNotice(`${seller.businessName} approved successfully.`);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to approve this verification.');
    }
  };

  const rejectSeller = async (seller) => {
    const reason = window.prompt('Enter rejection reason:', 'Incomplete or unclear verification documents.');
    if (!reason) return;
    try {
      await adminService.rejectSeller(seller.id, reason);
      setApplications((items) => items.filter((item) => item.id !== seller.id));
      setNotice(`${seller.businessName} rejected.`);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to reject this verification.');
    }
  };

  return (
    <>
      <RoleNavbar />
      <main className="seller-verification-page conmat-page-shell">
        <section className="seller-verification-hero conmat-page-hero">
        <span>Seller Verification</span>
        <h1>Approve only genuine construction material sellers.</h1>
        <p>Review sellers' documents before they go live.</p>
      </section>

      {notice && <div className="seller-verification-notice">{notice}</div>}

      <section className="seller-verification-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by business, owner, city or material" />
      </section>

      <section className="seller-verification-grid">
        {visibleApplications.length ? visibleApplications.map((seller) => (
          <SellerVerificationCard key={seller.id} seller={seller} onApprove={approveSeller} onReject={rejectSeller} />
        )) : <div className="seller-verification-empty">No pending verifications.</div>}
      </section>
    </main>
    </>
  );
}
