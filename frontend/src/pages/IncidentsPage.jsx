import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";
import { Edit2, Trash2 } from "lucide-react";

const initialForm = {
  prisoner_id: 1,
  location_id: 1,
  incident_date: new Date().toISOString().slice(0, 16),
  incident_type: "",
  severity: "Medium",
  penalty_points: 0,
  description: "",
};

// Helper for real-time search (case-insensitive)
function includesText(value, query) {
  return String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

function CreateIncidentModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/incidents", {
        ...form,
        prisoner_id: Number(form.prisoner_id),
        location_id: Number(form.location_id),
        penalty_points: Number(form.penalty_points),
      });
      showToast("Incident created", "success");
      setForm(initialForm);
      onSaved();
      onClose();
    } catch (err) {
      const msg = parseApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo Sự cố</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
          <label>Location ID<input type="number" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} required /></label>
          <label>Incident date<input type="datetime-local" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} required /></label>
          <label>Type<input value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })} /></label>
          <label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label>Penalty<input type="number" value={form.penalty_points} onChange={(e) => setForm({ ...form, penalty_points: e.target.value })} /></label>
          <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * EditIncidentModal - Per-row edit with pre-filled data
 * Follows the same modal + form pattern as other pages (Labor, Prisoners, Locations)
 */
function EditIncidentModal({ incident, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    prisoner_id: "",
    location_id: "",
    incident_date: "",
    incident_type: "",
    severity: "Medium",
    penalty_points: 0,
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dedicated state for the Prisoner dropdown inside the modal.
  // We fetch fresh when the modal opens to guarantee the list is available.
  const [dropdownPrisoners, setDropdownPrisoners] = useState([]);
  const [loadingPrisoners, setLoadingPrisoners] = useState(false);

  // Load prisoners specifically for this Edit modal when it opens.
  // Triggered by the `incident` prop changing (i.e. when user clicks Edit).
  useEffect(() => {
    const loadDropdownPrisoners = async () => {
      if (!incident) return;
      setLoadingPrisoners(true);
      try {
        const response = await api.get(`/prisoners?page=1&page_size=100`);
        const list = response.data || [];
        setDropdownPrisoners(list);
        console.log("[EditIncidentModal] Prisoners loaded for dropdown:", list.length);
      } catch (err) {
        console.error("[EditIncidentModal] Failed to load prisoners:", err);
        // Keep empty list; the UI will show the disabled option.
      } finally {
        setLoadingPrisoners(false);
      }
    };

    loadDropdownPrisoners();
  }, [incident]);

  // Prefill form (and ensure prisoner is pre-selected) when the incident being edited changes
  useEffect(() => {
    if (!incident) return;
    setForm({
      prisoner_id: incident.prisoner_id ?? "",
      location_id: incident.location_id ?? "",
      incident_date: incident.incident_date ? String(incident.incident_date).slice(0, 16) : "",
      incident_type: incident.incident_type ?? "",
      severity: incident.severity ?? "Medium",
      penalty_points: incident.penalty_points ?? 0,
      description: incident.description ?? "",
    });
    setError("");
  }, [incident]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!incident) return;

    setLoading(true);
    setError("");

    // Build payload - only send fields that make sense to update
    const payload = {
      prisoner_id: Number(form.prisoner_id),
      location_id: form.location_id ? Number(form.location_id) : null,
      incident_date: form.incident_date,
      incident_type: form.incident_type || null,
      severity: form.severity,
      penalty_points: Number(form.penalty_points) || 0,
      description: form.description || null,
    };

    try {
      await api.put(`/incidents/${incident.incident_id}`, payload);
      showToast(`Incident #${incident.incident_id} updated`, "success");
      onSaved();
      onClose();
    } catch (err) {
      const msg = parseApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!incident) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Incident #{incident.incident_id}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Prisoner
            <select
              value={form.prisoner_id}
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })}
              required
              disabled={loadingPrisoners}
            >
              <option value="">Select prisoner</option>
              {loadingPrisoners && (
                <option value="" disabled>Đang tải tù nhân...</option>
              )}
              {!loadingPrisoners && dropdownPrisoners.length === 0 && (
                <option value="" disabled>Không tải được tù nhân (kiểm tra console)</option>
              )}
              {dropdownPrisoners.map((p) => (
                <option key={p.prisoner_id} value={p.prisoner_id}>
                  {p.full_name} (#{p.prisoner_id})
                </option>
              ))}
            </select>
            {loadingPrisoners && <span style={{ fontSize: "0.8rem", marginLeft: "8px", color: "var(--muted)" }}>Đang tải...</span>}
          </label>

          <label>
            Mã Địa điểm
            <input
              type="number"
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
            />
          </label>

          <label>
            Ngày sự cố
            <input
              type="datetime-local"
              value={form.incident_date}
              onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
              required
            />
          </label>

          <label>
            Loại
            <input
              value={form.incident_type}
              onChange={(e) => setForm({ ...form, incident_type: e.target.value })}
              placeholder="ví dụ: Đánh nhau, Trộm cắp, Y tế"
            />
          </label>

          <label>
            Mức độ
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              <option>Thấp</option>
              <option>Trung bình</option>
              <option>Cao</option>
            </select>
          </label>

          <label>
            Penalty Points
            <input
              type="number"
              value={form.penalty_points}
              onChange={(e) => setForm({ ...form, penalty_points: e.target.value })}
            />
          </label>

          <label className="full-width">
            Description / Notes
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu Thay đổi"}
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

export default function IncidentsPage() {
  const { user } = useAuth();
  const isGuard = user?.role === "Guard";

  // Role-based permissions for Incidents
  // Guard: can create + edit only incidents they created (using created_by), no delete
  // Admin/Warden: full (create, edit any, delete)
  const canCreate = true; // Guard and higher roles
  const canDelete = !isGuard;

  const [rows, setRows] = useState([]);
  const [prisoners, setPrisoners] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Per-row editing state
  const [editingIncident, setEditingIncident] = useState(null);

  // Filters state for table (prisoner, date, severity) + search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrisonerId, setFilterPrisonerId] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/incidents?page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  // Load prisoners for name resolution in table + for the Edit modal dropdown.
  // We load this data at page level (consistent with LaborPage / other pages pattern).
  const loadPrisoners = async () => {
    try {
      const response = await api.get(`/prisoners?page=1&page_size=100`);
      setPrisoners(response.data || []);
      console.log("[IncidentsPage] Parent prisoners loaded:", (response.data || []).length);
    } catch (err) {
      console.error("[IncidentsPage] Failed to load prisoners for table:", err);
      // Non-fatal for table name display; modal will show empty state if this fails.
    }
  };

  // Load incident rows when page changes
  useEffect(() => {
    load();
  }, [page]);

  // Load prisoners once on initial mount
  useEffect(() => {
    loadPrisoners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure we refresh the prisoners list (for table names) when Edit is opened.
  // The modal itself also fetches independently for its dropdown.
  useEffect(() => {
    if (editingIncident) {
      loadPrisoners();
    }
  }, [editingIncident]);

  // Map prisoner_id -> full_name for display and search
  const prisonerNameById = useMemo(() => {
    const map = {};
    prisoners.forEach((p) => {
      map[p.prisoner_id] = p.full_name;
    });
    return map;
  }, [prisoners]);

  // Client-side filtering: search + explicit filters (prisoner, date, severity)
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const prisonerName = prisonerNameById[row.prisoner_id] || "";

      const matchesSearch = !q ||
        includesText(prisonerName, q) ||
        includesText(row.severity, q) ||
        includesText(row.incident_type, q) ||
        includesText(row.description, q) ||
        includesText(row.prisoner_id, q);

      const matchesPrisoner = !filterPrisonerId || String(row.prisoner_id) === String(filterPrisonerId);
      const matchesSeverity = !filterSeverity || row.severity === filterSeverity;

      let matchesDate = true;
      if (filterDate) {
        const rowDate = String(row.incident_date || "").slice(0, 10);
        matchesDate = rowDate === filterDate;
      }

      return matchesSearch && matchesPrisoner && matchesSeverity && matchesDate;
    });
  }, [rows, searchTerm, prisonerNameById, filterPrisonerId, filterDate, filterSeverity]);

  const deleteIncident = async (incidentId) => {
    const confirmed = window.confirm("Delete this incident permanently?");
    if (!confirmed) return;

    // If we were editing this one, close the modal
    if (editingIncident?.incident_id === incidentId) {
      setEditingIncident(null);
    }

    setError("");
    try {
      await api.delete(`/incidents/${incidentId}`);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  // Sidebar: Guard gets Create button too (per requirements)
  const createActions = canCreate
    ? [
        { label: "+ Tạo Sự cố Mới", onClick: () => setShowCreateModal(true), variant: "create" },
      ]
    : [];

  const showToast = (message, type = "info") => setToast({ message, type });

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Actions" actions={createActions} />
      </div>

      <div className="page-main-data">
      <section className="panel">
        <div className="panel-header">
          <h2>Sự cố</h2>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {/* Search + Filters + Pagination */}
        <div className="inline-form" style={{ flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
          {/* Search bar */}
          <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
            <input
              type="text"
              placeholder="Search by prisoner name, severity, type or notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (page !== 1) setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text)",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="secondary-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <span className="muted">Trang {page}</span>
            <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>
              Sau
            </button>
          </div>

          {searchTerm && (
            <button
              className="secondary-btn"
              onClick={() => setSearchTerm("")}
              style={{ marginLeft: "auto" }}
            >
              Clear search
            </button>
          )}
        </div>

        {/* Dedicated filters per requirement: prisoner, date, severity */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px", alignItems: "flex-end" }}>
          <label style={{ minWidth: "180px" }}>
            Tù nhân
            <select
              value={filterPrisonerId}
              onChange={(e) => {
                setFilterPrisonerId(e.target.value);
                if (page !== 1) setPage(1);
              }}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
            >
              <option value="">Tất cả tù nhân</option>
              {prisoners.map((p) => (
                <option key={p.prisoner_id} value={p.prisoner_id}>
                  {p.full_name} (#{p.prisoner_id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Ngày sự cố
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (page !== 1) setPage(1);
              }}
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
            />
          </label>

          <label>
            Severity
            <select
              value={filterSeverity}
              onChange={(e) => {
                setFilterSeverity(e.target.value);
                if (page !== 1) setPage(1);
              }}
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
            >
              <option value="">Tất cả</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>

          {(filterPrisonerId || filterDate || filterSeverity || searchTerm) && (
            <button
              className="secondary-btn"
              onClick={() => {
                setFilterPrisonerId("");
                setFilterDate("");
                setFilterSeverity("");
                setSearchTerm("");
                if (page !== 1) setPage(1);
              }}
            >
              Xóa filter
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Prisoner</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Date</th>
                <th>Description</th>
                <th style={{ width: "140px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                    {(searchTerm || filterPrisonerId || filterDate || filterSeverity) ? "Không có sự cố nào khớp bộ lọc." : "Không tìm thấy sự cố nào."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const prisonerName = prisonerNameById[row.prisoner_id];
                  // Guard can only edit incidents they created (row.created_by from backend)
                  const canEditThis = !isGuard || (row.created_by && row.created_by === user?.user_id);

                  return (
                    <tr key={row.incident_id}>
                      <td>{row.incident_id}</td>
                      <td>
                        {prisonerName ? (
                          <span>{prisonerName} <span className="muted">#{row.prisoner_id}</span></span>
                        ) : (
                          `#${row.prisoner_id}`
                        )}
                      </td>
                      <td>{row.incident_type || "-"}</td>
                      <td>
                        <span className={`status-badge ${row.severity === "High" ? "risk-high" : row.severity === "Medium" ? "risk-medium" : "risk-low"}`}>
                          {row.severity}
                        </span>
                      </td>
                      <td>{String(row.incident_date || "").slice(0, 16)}</td>
                      <td style={{ maxWidth: "280px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.description || "-"}
                      </td>

                      <td>
                        <div className="table-actions">
                          {canEditThis && (
                            <button
                              className="btn-sm btn-edit"
                              onClick={() => setEditingIncident(row)}
                              title="Edit incident"
                            >
                              <Edit2 size={14} style={{ marginRight: 4 }} />
                              Edit
                            </button>
                          )}

                          {canDelete && (
                            <button
                              className="btn-sm btn-delete"
                              onClick={() => deleteIncident(row.incident_id)}
                              title="Delete incident"
                            >
                              <Trash2 size={14} style={{ marginRight: 4 }} />
                              Delete
                            </button>
                          )}

                          {/* Guard sees no buttons on incidents they didn't create */}
                          {isGuard && !canEditThis && (
                            <span className="muted" style={{ fontSize: "0.75rem" }}>Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {(searchTerm || filterPrisonerId || filterDate || filterSeverity) && filteredRows.length < rows.length && (
          <p className="muted" style={{ marginTop: "8px", fontSize: "0.85rem" }}>
            Showing {filteredRows.length} of {rows.length} incidents on this page (filtered).
          </p>
        )}
      </section>

      {/* Create Modal - Guard can create too */}
      {showCreateModal && canCreate && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {/* Edit Modal - Guard can open only for their own (button visibility controls it) */}
      {editingIncident && (
        <EditIncidentModal
          incident={editingIncident}
          onClose={() => setEditingIncident(null)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
