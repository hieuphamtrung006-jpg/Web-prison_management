import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

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
      showToast("Location updated", "success");
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
          <h3>Edit location: {location?.location_name}</h3>
          <button className="close-btn" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Name
            <input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} required />
          </label>

          <label>
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Cell</option>
              <option>Workshop</option>
              <option>Dining</option>
              <option>Yard</option>
              <option>Hospital</option>
            </select>
          </label>

          <label>
            Capacity
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min={1} required />
          </label>

          <label>
            Security
            <input value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })} />
          </label>

          <label>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
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

export default function LocationsPage() {
  const { user } = useAuth();
  const isGuard = user?.role === "Guard";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const createLocation = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/locations", { ...form, capacity: Number(form.capacity) });
      setForm(initialForm);
      showToast("Location created", "success");
      setPage(1);
      await load(1);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  };

  const deleteLocation = async (loc) => {
    const confirmed = window.confirm(`Delete location "${loc.location_name}" permanently?`);
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/locations/${loc.location_id}`);
      showToast("Location deleted", "success");
      await load(page);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  const canWrite = user?.role === "Admin" || user?.role === "Warden";
  const showActions = !isGuard;

  return (
    <div className="split-grid users-page">
      <section className="panel">
        <h2>Locations</h2>
        {error && <div className="error-msg">{error}</div>}

        <div className="inline-form pagination">
          <button className="secondary-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" disabled={loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading locations...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="loading-state">
            <p>No locations found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Occupancy</th>
                  <th>Rate</th>
                  <th>Status</th>
                  {showActions && <th>Actions</th>}
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
                              Edit
                            </button>
                            <button className="btn-sm btn-delete" onClick={() => deleteLocation(r)} disabled={!canWrite}>
                              Delete
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

      {!isGuard && (
        <section className="panel">
          <div className="section-head">
            <h2>Create location</h2>
            <button className="secondary-btn" type="button" onClick={() => setShowCreateForm((open) => !open)}>
              {showCreateForm ? "Hide" : "Show"}
            </button>
          </div>
          {showCreateForm && (
            <form className="form-grid" onSubmit={createLocation}>
              <label>
                Name
                <input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} required />
              </label>

              <label>
                Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Cell</option>
                  <option>Workshop</option>
                  <option>Dining</option>
                  <option>Yard</option>
                  <option>Hospital</option>
                </select>
              </label>

              <label>
                Capacity
                <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min={1} required />
              </label>

              <label>
                Security
                <input value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })} />
              </label>

              <button className="primary-btn" type="submit" disabled={!canWrite || creating}>
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
          )}
        </section>
      )}

      {editing && (
        <LocationEditModal
          location={editing}
          onClose={() => setEditing(null)}
          onSaved={() => load(page)}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
