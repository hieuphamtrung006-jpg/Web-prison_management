import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

const initialForm = {
  username: "",
  full_name: "",
  role: "Guard",
  email: "",
  phone: "",
  password: "",
};

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}

function UserEditModal({ user, onClose, onSaved, showToast }) {
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

  useEffect(() => {
    setForm({
      full_name: user?.full_name || "",
      role: user?.role || "Guard",
      email: user?.email || "",
      phone: user?.phone || "",
      password: "",
      is_active: user?.is_active ?? true,
    });
    setError("");
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      showToast("User updated successfully", "success");
      onSaved();
      onClose();
    } catch (err) {
      const errorMsg = parseApiError(err);
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit User: {user?.username}</h3>
          <button className="close-btn" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Full name
            <input
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              required
            />
          </label>

          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
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
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>

          <label>
            Phone
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>

          <label>
            New password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Leave blank to keep current password"
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            Active
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
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

  const load = async (pageNumber = page) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/users?active_only=true&page=${pageNumber}&page_size=${pageSize}`);
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
    load(page);
  }, [page]);

  const createUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      await api.post("/users", form);
      setForm(initialForm);
      showToast("User created successfully", "success");

      if (page === 1) {
        await load(1);
      } else {
        setPage(1);
      }
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

    setError("");

    try {
      await api.delete(`/users/${userId}`);
      showToast("User deleted successfully", "success");
      await load(page);
    } catch (err) {
      const errorMsg = parseApiError(err);
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return (
    <div className="split-grid users-page">
      <section className="panel">
        <h2>Users</h2>
        {error && <div className="error-msg">{error}</div>}

        <div className="inline-form pagination">
          <button className="secondary-btn" disabled={page <= 1 || loading} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}>
            Prev
          </button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" disabled={loading} onClick={() => setPage((currentPage) => currentPage + 1)}>
            Next
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading users...</p>
          </div>
        ) : rows.length === 0 ? (
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
                  <th>Full name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id}>
                    <td>{row.user_id}</td>
                    <td>{row.username}</td>
                    <td>{row.full_name}</td>
                    <td>{row.role}</td>
                    <td>{row.email || "-"}</td>
                    <td>
                      <span className={`status-badge ${row.is_active ? "status-active" : "status-inactive"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-sm btn-edit" type="button" onClick={() => setEditingUser(row)}>
                          Edit
                        </button>
                        <button className="btn-sm btn-delete" type="button" onClick={() => deleteUser(row.user_id, row.username)}>
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
        <h2>Create user</h2>
        <form className="form-grid" onSubmit={createUser}>
          <label>
            Username
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
          </label>
          <label>
            Full name
            <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option>Admin</option>
              <option>Warden</option>
              <option>Guard</option>
              <option>Viewer</option>
            </select>
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
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
          showToast={showToast}
          onSaved={() => load(page)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
