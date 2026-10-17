import './AdminUserTable.css';

export default function AdminUserTable({ users, currentUserId, onStatusChange, onViewDocuments }) {
  return (
    <div className="admin-user-table-wrap">
      <table className="admin-user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>City</th>
            <th>Status</th>
            <th>Orders</th>
            <th>Joined</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                {user.role !== 'Admin' && (
                  <button
                    type="button"
                    className="admin-user-documents-button"
                    onClick={() => onViewDocuments(user)}
                  >
                    Verification documents
                  </button>
                )}
              </td>

              <td>{user.role}</td>
              <td>{user.city}</td>

              <td>
                <em
                  className={`user-status user-status--${user.status.toLowerCase()}`}
                >
                  {user.status}
                </em>
                {['Supplier', 'Wholesaler', 'Retailer'].includes(user.role) && (
                  <small className="user-verification-status">Verification: {user.verificationStatus}</small>
                )}
              </td>

              <td>{user.orders}</td>
              <td>{user.joined}</td>

              <td>
                <select
                  className="admin-user-action-select"
                  value={user.status}
                  disabled={user.id === currentUserId}
                  title={user.id === currentUserId ? 'You cannot change your own admin status.' : 'Change account status'}
                  onChange={(event) => onStatusChange(user, event.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Mark Pending</option>
                  <option value="Rejected">Reject</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
