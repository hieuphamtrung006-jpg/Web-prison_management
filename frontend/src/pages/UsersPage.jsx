import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  username: "",
  full_name: "",
  role: "Guard",
  email: "",
  phone: "",
  password: "",
};

function UserEditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    role: user?.role || "Guard",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    is_active: user?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        full_name: form.full_name,
        role: form.role,
        email: form.email || null,
        phone: form.phone || null,
        is_active: form.is_active,
      };
      if (form.password) {
        payload.password = form.password;
      }

      await api.put(`/users/${user.user_id}`, payload);
      onSave();
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit User: {user?.username}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Full Name
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </label>

          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Admin</option>
              <option>Warden</option>
              <option>Guard</option>
              <option>Viewer</option>
            </select>
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>

          <label>
            New Password (leave blank to keep current)
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>

          <div className="modal-buttons">
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button type="button" className="secondary-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {message}
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const isGuard = user?.role === "Guard";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const pageSize = 20;

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/users?active_only=true&page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      const errorMsg = parseApiError(err);
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const createUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      await api.post("/users", form);
      setForm(initialForm);
      showToast("User created successfully", "success");
      setPage(1);
      await load();
    } catch (err) {
      const errorMsg = parseApiError(err);
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (userId, username) => {
    const confirmed = window.confirm(`Delete user "${username}" permanently? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/users/${userId}`);
      showToast("User deleted successfully", "success");
      await load();
    } catch (err) {
      const errorMsg = parseApiError(err);
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const visibleRows = isGuard ? rows.filter((row) => row.role === "Viewer") : rows;

  return (
    <div className="users-page">
      <style>{`
        .users-page {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 20px;
        }

        @media (max-width: 1024px) {
          .users-page {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .panel h2 {
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #333;
        }

        .table-wrap {
          overflow-x: auto;
          margin: 20px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        table th {
          background: #f0f0f0;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }

        table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        table tbody tr:hover {
          background: #fafafa;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: #d4edda;
          color: #155724;
        }

        .status-inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .table-actions {
          display: flex;
          gap: 8px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-edit {
          background: #007bff;
          color: white;
        }

        .btn-edit:hover {
          background: #0056b3;
        }

        .btn-delete {
          background: #dc3545;
          color: white;
        }

        .btn-delete:hover {
          background: #c82333;
        }

        .pagination {
          display: flex;
          gap: 10px;
          align-items: center;
          margin: 20px 0;
          justify-content: center;
        }

        .pagination button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
        }

        .pagination button:hover:not(:disabled) {
          background: #f0f0f0;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-grid > * {
          grid-column: 1 / -1;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-weight: 500;
          color: #333;
        }

        label input,
        label select {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        label input:focus,
        label select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .primary-btn,
        .secondary-btn,
        .danger-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .primary-btn {
          background: #28a745;
          color: white;
        }

        .primary-btn:hover:not(:disabled) {
          background: #218838;
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary-btn {
          background: #6c757d;
          color: white;
        }

        .secondary-btn:hover:not(:disabled) {
          background: #5a6268;
        }

        .secondary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .danger-btn {
          background: #dc3545;
          color: white;
        }

        .danger-btn:hover {
          background: #c82333;
        }

        .error-msg {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .close-btn:hover {
          color: #333;
        }

        .modal-content form {
          padding: 20px;
        }

        .modal-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .modal-buttons button {
          flex: 1;
        }

        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 16px 20px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 2000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .toast-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .toast-info {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }

        .inline-form {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .muted {
          color: #666;
          font-size: 14px;
        }
      `}</style>

      <section className="panel">
        <h2>Users</h2>
        {error && <div className="error-msg">{error}</div>}

        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Prev
          </button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="loading-state">
            <p>No users found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.user_id}>
                    <td>{row.user_id}</td>
                    <td>{row.username}</td>
                    <td>{row.full_name}</td>
                    <td>{row.role}</td>
                    <td>{row.email || "-"}</td>
                    <td>
                      <span className={`status-badge status-${row.is_active ? "active" : "inactive"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-sm btn-edit"
                          onClick={() => setEditingUser(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-sm btn-delete"
                          onClick={() => deleteUser(row.user_id, row.username)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Create User</h2>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={createUser}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Full Name
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Admin</option>
              <option>Warden</option>
              <option>Guard</option>
              <option>Viewer</option>
            </select>
          </label>
          <label>
            Email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <button className="primary-btn" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={() => {
            showToast("User updated successfully", "success");
            load();
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
