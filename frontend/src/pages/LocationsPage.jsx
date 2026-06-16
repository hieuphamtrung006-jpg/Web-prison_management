import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";

const initialForm = {
  location_name: "",
  type: "Cell",
  capacity: 4,
  security_level: "Medium",
  is_active: true,
};

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}

function LocationEditModal({ location, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    location_name: location?.location_name || "",
    type: location?.type || "Cell",
    capacity: location?.capacity || 1,
    security_level: location?.security_level || "",
    is_active: location?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      location_name: location?.location_name || "",
      type: location?.type || "Cell",
      capacity: location?.capacity || 1,
      security_level: location?.security_level || "",
      is_active: location?.is_active ?? true,
    });
    setError("");
  }, [location]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        location_name: form.location_name,
        type: form.type || null,
        capacity: Number(form.capacity),
        security_level: form.security_level || null,
        is_active: form.is_active,
      };

      await api.put(`/locations/${location.location_id}`, payload);
      showToast("Đã cập nhật địa điểm", "success");
      onSaved();
      onClose();
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sửa địa điểm: {location?.location_name}</h3>
          <button className="close-btn" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Tên
            <input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} required />
          </label>

          <label>
            Loại
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Buồng giam</option>
              <option>Phân xưởng</option>
              <option>Phòng ăn</option>
              <option>Sân tập</option>
              <option>Bệnh xá</option>
            </select>
          </label>

          <label>
            Sức chứa
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min={1} required />
          </label>

          <label>
            Mức an ninh
            <input value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })} />
          </label>

          <label>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Hoạt động
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateLocationModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/locations", {
        location_name: form.location_name,
        type: form.type,
        capacity: Number(form.capacity),
        security_level: form.security_level || null,
        is_active: form.is_active,
      });
      showToast("Đã tạo địa điểm", "success");
      setForm(initialForm);
      onSaved();
      onClose();
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo Địa điểm</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Tên
            <input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} required />
          </label>
          <label>
            Loại
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Buồng giam</option>
              <option>Phân xưởng</option>
              <option>Phòng ăn</option>
              <option>Sân tập</option>
              <option>Bệnh xá</option>
            </select>
          </label>
          <label>
            Sức chứa
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min={1} required />
          </label>
          <label>
            Mức an ninh
            <input value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })} />
          </label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo"}
            </button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const { user } = useAuth();
  const isGuard = user?.role === "Guard";
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const pageSize = 20;

  const showToast = (message, type = "info") => setToast({ message, type });

  const load = async (pageNumber = page) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/locations?page=${pageNumber}&page_size=${pageSize}`);
      setRows(res.data);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const deleteLocation = async (loc) => {
    const confirmed = window.confirm(`Xóa địa điểm "${loc.location_name}" vĩnh viễn?`);
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/locations/${loc.location_id}`);
      showToast("Đã xóa địa điểm", "success");
      await load(page);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  const canWrite = user?.role === "Admin" || user?.role === "Warden";
  const showActions = !isGuard;

  const canCreateLoc = !isGuard;
  const createActions = canCreateLoc
    ? [
        {
          label: "+ Tạo Địa điểm",
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
        <h2>Địa điểm</h2>
        {error && <div className="error-msg">{error}</div>}

        <div className="inline-form pagination">
          <button className="secondary-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Trước
          </button>
          <span className="muted">Trang {page}</span>
          <button className="secondary-btn" disabled={loading} onClick={() => setPage((p) => p + 1)}>
            Sau
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Đang tải địa điểm...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="loading-state">
            <p>Không tìm thấy địa điểm</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>Sức chứa</th>
                  <th>Đang ở</th>
                  <th>Tỷ lệ</th>
                  <th>Trạng thái</th>
                  {showActions && <th>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rate = r.capacity ? (r.current_occupancy / r.capacity) * 100 : 0;
                  const over = r.current_occupancy > r.capacity;
                  return (
                    <tr key={r.location_id}>
                      <td>{r.location_id}</td>
                      <td>{r.location_name}</td>
                      <td>{r.type || "-"}</td>
                      <td>{r.capacity}</td>
                      <td>{r.current_occupancy}</td>
                      <td>{rate.toFixed(1)}%</td>
                      <td>
                        <span className={`status-badge ${over ? "status-inactive" : "status-active"}`}>
                          {over ? "Over Capacity" : "Normal"}
                        </span>
                      </td>
                      {showActions && (
                        <td>
                          <div className="table-actions">
                            <button className="btn-sm btn-edit" onClick={() => setEditing(r)} disabled={!canWrite}>
                              Sửa
                            </button>
                            <button className="btn-sm btn-delete" onClick={() => deleteLocation(r)} disabled={!canWrite}>
                              Xóa
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <LocationEditModal
          location={editing}
          onClose={() => setEditing(null)}
          onSaved={() => load(page)}
          showToast={showToast}
        />
      )}

      {showCreateModal && canCreateLoc && (
        <CreateLocationModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setPage(1);
            load(1);
          }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
