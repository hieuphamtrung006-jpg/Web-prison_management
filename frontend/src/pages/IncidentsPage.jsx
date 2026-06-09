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
          <h3>Create Incident</h3>
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
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
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

  // Local prisoners list for the dropdown — ensures it always loads when Edit modal opens
  const [prisoners, setPrisoners] = useState([]);
  const [loadingPrisoners, setLoadingPrisoners] = useState(false);

  // Fetch prisoners when the modal opens (i.e. when `incident` prop is provided)
  // This is more reliable than relying only on parent page load.
  useEffect(() => {
    const fetchPrisonersForModal = async () => {
      if (!incident) return;
      setLoadingPrisoners(true);
      try {
        // Use a generous page_size to get most/all prisoners for the select
        const response = await api.get(`/prisoners?page=1&page_size=500`);
        setPrisoners(response.data || []);
      } catch (err) {
        console.error("Failed to load prisoners for Edit Incident modal:", err);
        // Non-fatal: user can still see the current prisoner_id if needed,
        // but dropdown will be empty or partial.
      } finally {
        setLoadingPrisoners(false);
      }
    };

    fetchPrisonersForModal();
  }, [incident]);

  // Prefill form when incident prop changes (important for modal reuse)
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
              {prisoners.length === 0 && !loadingPrisoners && (
                <option value="" disabled>No prisoners loaded</option>
              )}
              {prisoners.map((p) => (
                <option key={p.prisoner_id} value={p.prisoner_id}>
                  {p.full_name} (#{p.prisoner_id})
                </option>
              ))}
            </select>
            {loadingPrisoners && <span className="muted" style={{ fontSize: "0.8rem", marginLeft: 8 }}>Loading...</span>}
          </label>

          <label>
            Location ID
            <input
              type="number"
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
            />
          </label>

          <label>
            Incident date
            <input
              type="datetime-local"
              value={form.incident_date}
              onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
              required
            />
          </label>

          <label>
            Type
            <input
              value={form.incident_type}
              onChange={(e) => setForm({ ...form, incident_type: e.target.value })}
              placeholder="e.g. Fight, Theft, Medical"
            />
          </label>

          <label>
            Severity
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
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
              {loading ? "Saving..." : "Save Changes"}
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

export default function IncidentsPage() {
  const { user } = useAuth();
  const isGuard = user?.role === "Guard";
  const [rows, setRows] = useState([]);
  const [prisoners, setPrisoners] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Per-row editing state (new primary UX)
  const [editingIncident, setEditingIncident] = useState(null);

  // Real-time search
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/incidents?page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  // Load prisoners for name resolution + nice dropdown in Edit modal
  const loadPrisoners = async () => {
    try {
      // Load a reasonable number for mapping + selects (incidents don't have huge prisoner lists)
      const response = await api.get(`/prisoners?page=1&page_size=300`);
      setPrisoners(response.data || []);
    } catch (err) {
      // Non-fatal - we can still show IDs
      console.warn("Could not load prisoners for name mapping", err);
    }
  };

  useEffect(() => {
    load();
    loadPrisoners();
  }, [page]);

  // Map prisoner_id -> full_name for display and search
  const prisonerNameById = useMemo(() => {
    const map = {};
    prisoners.forEach((p) => {
      map[p.prisoner_id] = p.full_name;
    });
    return map;
  }, [prisoners]);

  // Client-side real-time filtering (search by prisoner name, severity, type, description)
  const filteredRows = useMemo(() => {
    const q = searchTerm;
    if (!q || !q.trim()) return rows;

    return rows.filter((row) => {
      const prisonerName = prisonerNameById[row.prisoner_id] || "";
      return (
        includesText(prisonerName, q) ||
        includesText(row.severity, q) ||
        includesText(row.incident_type, q) ||
        includesText(row.description, q) ||
        includesText(row.prisoner_id, q) // fallback to ID
      );
    });
  }, [rows, searchTerm, prisonerNameById]);

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

  const canManage = !isGuard;

  // Sidebar now only has Create (per-row Edit is the main way to edit)
  const createActions = canManage
    ? [
        { label: "+ Create Incident", onClick: () => setShowCreateModal(true), variant: "create" },
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
          <h2>Incidents</h2>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {/* Search + Pagination controls */}
        <div className="inline-form" style={{ flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          {/* Search bar - real-time filter */}
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
              Prev
            </button>
            <span className="muted">Page {page}</span>
            <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>
              Next
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
                {canManage && <th style={{ width: "120px" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                    {searchTerm ? "No incidents match your search." : "No incidents found."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const prisonerName = prisonerNameById[row.prisoner_id];
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

                      {canManage && (
                        <td>
                          <div className="table-actions">
                            {/* Per-row Edit button (primary new feature) */}
                            <button
                              className="btn-sm btn-edit"
                              onClick={() => setEditingIncident(row)}
                              title="Edit incident"
                            >
                              <Edit2 size={14} style={{ marginRight: 4 }} />
                              Edit
                            </button>

                            <button
                              className="btn-sm btn-delete"
                              onClick={() => deleteIncident(row.incident_id)}
                              title="Delete incident"
                            >
                              <Trash2 size={14} style={{ marginRight: 4 }} />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {searchTerm && filteredRows.length < rows.length && (
          <p className="muted" style={{ marginTop: "8px", fontSize: "0.85rem" }}>
            Showing {filteredRows.length} of {rows.length} incidents on this page (filtered).
          </p>
        )}
      </section>

      {/* Create Modal (existing) */}
      {showCreateModal && canManage && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {/* NEW: Per-row Edit Modal with pre-filled data.
          The modal now fetches its own prisoners list on open for reliable dropdown. */}
      {editingIncident && canManage && (
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
