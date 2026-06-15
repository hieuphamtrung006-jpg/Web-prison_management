import { useEffect, useState, useRef } from "react";
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
      showToast("Location created", "success");
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
          <h3>Create Location</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
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
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Search states: draft for inputs (controlled), applied for API calls
  // Separate for search (text, debounced) and type (select, immediate)
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [typeDraft, setTypeDraft] = useState("");

  // Ref for search debounce timer (to avoid Network spam on keystroke)
  const searchDebounceRef = useRef(null);

  const pageSize = 20;

  const showToast = (message, type = "info") => setToast({ message, type });

  // Updated load to support search query params from backend
  // search: partial name match (ilike), type: exact type filter
  // Keeps pagination, works for all allowed roles (Admin/Warden/Guard)
  // load accepts optional overrideSearch and overrideType so callers (button, debounce, delete, modals)
  // can pass the exact intended values at call time. This avoids any stale closure issues
  // where an old render's load would fetch without the search params.
  const load = async (pageNumber = page, overrideSearch, overrideType) => {
    setLoading(true);
    setError("");
    try {
      const effectiveSearch = overrideSearch !== undefined ? overrideSearch : search;
      const effectiveType = overrideType !== undefined ? overrideType : typeFilter;

      let url = `/locations?page=${pageNumber}&page_size=${pageSize}`;
      if (effectiveSearch) {
        url += `&search=${encodeURIComponent(effectiveSearch)}`;
      }
      if (effectiveType) {
        url += `&type=${encodeURIComponent(effectiveType)}`;
      }
      const res = await api.get(url);
      setRows(res.data);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Reload when page or active search/type filters change.
  // We pass the current values explicitly to load so the fetch always uses the right search/type.
  useEffect(() => {
    load(page, search, typeFilter);
  }, [page, search, typeFilter]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const deleteLocation = async (loc) => {
    const confirmed = window.confirm(`Delete location "${loc.location_name}" permanently?`);
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/locations/${loc.location_id}`);
      showToast("Location deleted", "success");
      await load(page, search, typeFilter);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  // Handlers for search (consistent with other pages like Prisoners)
  const handleSearch = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    const newSearch = searchDraft;
    const newType = typeDraft;

    // Update the applied state (for UI consistency and future effect-driven loads)
    setSearch(newSearch);
    setTypeFilter(newType);
    setPage(1);

    // CRITICAL: Immediately call load with the exact values from the button click.
    // This guarantees the API is called with the search params right now,
    // bypassing any potential timing/closure issues with the batched setState + useEffect.
    // This is the most likely fix for "click search but data stays the same as before search".
    load(1, newSearch, newType);
  };

  const handleResetFilters = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setSearchDraft("");
    setTypeDraft("");
    setSearch("");
    setTypeFilter("");
    setPage(1);

    // Explicit load with cleared filters so the table immediately shows all data
    load(1, "", "");
  };

  const canWrite = user?.role === "Admin" || user?.role === "Warden";
  const showActions = !isGuard;

  const canCreateLoc = !isGuard;
  const createActions = canCreateLoc
    ? [
        {
          label: "+ Create Location",
          onClick: () => setShowCreateModal(true),
          variant: "create",
        },
      ]
    : [];

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Actions" actions={createActions} />
      </div>

      <div className="page-main-data">
      <section className="panel">
        <h2>Locations</h2>
        {error && (
          <div className="error-msg" style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Search toolbar - consistent with Prisoners/Labor pages dark theme */}
        {/* Name search: debounced realtime (350ms) for smooth UX, no Network spam */}
        {/* Type: instant apply on change. Buttons for explicit control */}
        {/* Viewer (if ever accesses): sees search but no create/edit/delete (per canWrite/canCreateLoc) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px", alignItems: "flex-end" }}>
          <label style={{ minWidth: 200, flex: "1 1 200px" }}>
            Location Name
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => {
                const val = e.target.value;
                setSearchDraft(val);
                // Debounce search input
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = setTimeout(() => {
                  setSearch(val);
                  setPage(1);
                  // Explicit load using the value at debounce time + current type
                  load(1, val, typeFilter);
                }, 350);
              }}
              placeholder="Search by name (e.g. Phòng Khám)"
            />
          </label>

          <label style={{ minWidth: 140 }}>
            Type
            <select
              value={typeDraft}
              onChange={(e) => {
                const val = e.target.value;
                setTypeDraft(val);
                setTypeFilter(val);
                setPage(1);
                // Explicit load for immediate type filter
                load(1, search, val);
              }}
            >
              <option value="">All Types</option>
              <option>Cell</option>
              <option>Workshop</option>
              <option>Dining</option>
              <option>Yard</option>
              <option>Hospital</option>
            </select>
          </label>

          <button className="primary-btn" type="button" onClick={handleSearch}>
            Search
          </button>

          <button className="secondary-btn" type="button" onClick={handleResetFilters}>
            Reset
          </button>
        </div>

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
            <p>
              {(search || typeFilter)
                ? `Không tìm thấy Location nào khớp với từ khóa${search ? ` "${search}"` : ""}${typeFilter ? ` và loại "${typeFilter}"` : ""}.`
                : "No locations found"}
            </p>
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

      {editing && (
        <LocationEditModal
          location={editing}
          onClose={() => setEditing(null)}
          onSaved={() => load(page, search, typeFilter)}
          showToast={showToast}
        />
      )}

      {showCreateModal && canCreateLoc && (
        <CreateLocationModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            // Keep the current active search/type when creating new location
            // (so the list stays filtered after create)
            setPage(1);
            load(1, search, typeFilter);
          }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
