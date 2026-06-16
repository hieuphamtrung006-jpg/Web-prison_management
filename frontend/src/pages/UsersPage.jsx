import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";

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
          <h3>Sửa Người dùng: {user?.username}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Họ tên
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </label>

          <label>
            Vai trò
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Quản trị viên</option>
              <option>Giám thị trưởng</option>
              <option>Giám thị</option>
              <option>Người xem</option>
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
            Mật khẩu Mới (để trống để giữ nguyên)
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
            Hoạt động
          </label>

          <div className="modal-buttons">
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
            <button type="button" className="secondary-btn" onClick={onClose} disabled={loading}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onSave, showToast }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/users", form);
      showToast("Đã tạo người dùng", "success");
      setForm(initialForm);
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
          <h3>Create User</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Tên đăng nhập
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Họ tên
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </label>
          <label>
            Vai trò
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Quản trị viên</option>
              <option>Giám thị trưởng</option>
              <option>Giám thị</option>
              <option>Người xem</option>
            </select>
          </label>
          <label>
            Email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Điện thoại
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <div className="modal-buttons">
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo"}
            </button>
            <button type="button" className="secondary-btn" onClick={onClose} disabled={loading}>
              Hủy
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const deleteUser = async (userId, username) => {
    const confirmed = window.confirm(`Delete user "${username}" permanently? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/users/${userId}`);
      showToast("Đã xóa người dùng", "success");
      await load();
    } catch (err) {
      const errorMsg = parseApiError(err);
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const visibleRows = isGuard ? rows.filter((row) => row.role === "Viewer") : rows;

  const canCreateUser = !isGuard;
  const createActions = canCreateUser
    ? [
        {
          label: "+ Create User",
          onClick: () => setShowCreateModal(true),
          variant: "create",
        },
      ]
    : [];

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Hành động" actions={createActions} />
      </div>

      <div className="page-main-data">
      <section className="panel">
        <h2>Người dùng</h2>
        {error && <div className="error-msg">{error}</div>}

        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Trước
          </button>
          <span className="muted">Trang {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>
            Sau →
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Đang tải người dùng...</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="loading-state">
            <p>Không tìm thấy người dùng</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên đăng nhập</th>
                  <th>Họ tên</th>
                  <th>Vai trò</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
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
                        {row.is_active ? "Hoạt động" : "Không hoạt động"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-sm btn-edit"
                          onClick={() => setEditingUser(row)}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn-sm btn-delete"
                          onClick={() => deleteUser(row.user_id, row.username)}
                        >
                          Xóa
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

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={() => {
            showToast("Đã cập nhật người dùng", "success");
            load();
          }}
        />
      )}

      {showCreateModal && canCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setPage(1);
            load();
          }}
          showToast={showToast}
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
    </div>
  );
}
