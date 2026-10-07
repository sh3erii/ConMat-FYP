import { useEffect, useMemo, useState } from 'react';
import RoleNavbar from '../../components/common/RoleNavbar';
import AdminUserTable from '../../components/admin/AdminUserTable';
import VerificationDocumentsModal from '../../components/admin/VerificationDocumentsModal';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import './UserManagement.css';

const roles = ['All', 'Admin', 'Supplier', 'Wholesaler', 'Retailer', 'Customer'];

export default function UserManagement() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [notice, setNotice] = useState('');
  const [documentsUser, setDocumentsUser] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const response = await adminService.getUsers({ role: 'All' });
        if (active) setUsers(response.users || []);
      } catch (error) {
        if (active) setNotice(error.response?.data?.message || 'Unable to load users.');
      }
    }

    loadUsers();
    return () => { active = false; };
  }, []);

  const visibleUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((user) => {
      const matchesRole = role === 'All' || user.role === role;
      const matchesSearch = !query || `${user.name} ${user.email} ${user.city}`.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, search, role]);

  const handleStatusChange = async (user, status) => {
    if (!status || status === user.status) return;
    const defaultReason = status === 'Rejected'
      ? 'Account rejected by admin.'
      : status === 'Pending'
        ? 'Account placed under admin review.'
        : 'Account restored by admin.';
    const reason = window.prompt(`Reason for changing ${user.name} to ${status}:`, defaultReason);
    if (reason === null || (status !== 'Active' && !reason.trim())) return;

    try {
      const response = await adminService.updateUserStatus(user.id, status, reason.trim());
      const updatedUser = response.user || {};
      setUsers((items) => items.map((item) => (
        item.id === user.id ? { ...item, ...updatedUser } : item
      )));
      setNotice(`${user.name} is now ${status}.`);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to update this account status.');
    }
  };

  return (
    <>
      <RoleNavbar />
      <main className="user-management-page conmat-page-shell">
        <section className="user-management-hero conmat-page-hero">
        <span>User Management</span>
        <h1>Control users, roles and suspicious accounts from one admin workspace.</h1>
        <p>Admins can search customers, retailers, wholesalers and sellers, then move accounts to pending review or restore them when required.</p>
      </section>

      {notice && <div className="user-management-notice">{notice}</div>}

      <section className="user-management-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user, email or city" />
        <select className="conmat-filter-select" value={role} onChange={(event) => setRole(event.target.value)}>
          {roles.map((item) => <option key={item} value={item}>{item === 'All' ? 'All Roles' : item}</option>)}
        </select>
      </section>

      <section className="user-management-panel">
        <div className="user-management-panel__head">
          <div>
            <span>Platform Users</span>
            <h2>{visibleUsers.length} accounts found</h2>
          </div>
        </div>
        <AdminUserTable
          users={visibleUsers}
          currentUserId={currentAdmin?.id}
          onStatusChange={handleStatusChange}
          onViewDocuments={setDocumentsUser}
        />
      </section>
    </main>
      <VerificationDocumentsModal user={documentsUser} onClose={() => setDocumentsUser(null)} />
    </>
  );
}
