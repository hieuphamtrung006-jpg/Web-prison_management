import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import ActionSidebar from "../components/ActionSidebar";
import { useAuth } from "../context/AuthContext";
import { Edit2, Trash2 } from "lucide-react";

const initialForm = {
  prisoner_id: 1,
  visitor_name: "",
  visit_date: new Date().toISOString().slice(0, 16),
  notes: "",
};

const initialRequestForm = {
  prisoner_id: 1,
  requested_date: new Date().toISOString().slice(0, 16),
};

// Helper for real-time search (case-insensitive, consistent with other pages)
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

function RequestVisitModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState(initialRequestForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/visits/request", {
        prisoner_id: Number(form.prisoner_id),
        requested_date: form.requested_date,
      });
      showToast("Visit request submitted", "success");
      setForm(initialRequestForm);
      onSaved();
      onClose();
    } catch (err) {
      const m = parseApiError(err); setError(m); showToast(m, "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Request a Visit</h3><button className="close-btn" onClick={onClose}>×</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
          <label>Requested date<input type="datetime-local" value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })} required /></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Request"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateVisitModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/visits", { ...form, prisoner_id: Number(form.prisoner_id) });
      showToast("Visit created", "success");
      setForm(initialForm);
      onSaved();
      onClose();
    } catch (err) {
      const m = parseApiError(err); setError(m); showToast(m, "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Create Visit</h3><button className="close-btn" onClick={onClose}>×</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
          <label>Visitor<input value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} required /></label>
          <label>Date<input type="datetime-local" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required /></label>
          <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
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
 * EditVisitModal - Per-row edit modal with pre-filled current visit data.
 * Supports editing the most common fields: visitor, date, status, notes.
 * Prisoner can also be changed if needed.
 */
function EditVisitModal({ visit, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    prisoner_id: "",
    visitor_name: "",
    visit_date: "",
    status: "Pending",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Local prisoners list for the dropdown — fetch when modal opens
  const [prisoners, setPrisoners] = useState([]);
  const [loadingPrisoners, setLoadingPrisoners] = useState(false);

  // Fetch prisoners list *when the Edit modal is opened* (when `visit` becomes available).
  // This guarantees the dropdown is populated even if parent load was slow or failed.
  useEffect(() => {
    const fetchPrisonersForModal = async () => {
      if (!visit) return;
      setLoadingPrisoners(true);
      try {
        const response = await api.get(`/prisoners?page=1&page_size=500`);
        setPrisoners(response.data || []);
      } catch (err) {
        console.error("Failed to load prisoners for Edit Visit modal:", err);
      } finally {
        setLoadingPrisoners(false);
      }
    };

    fetchPrisonersForModal();
  }, [visit]);

  // Reset form when a different visit is passed in
  useEffect(() => {
    if (!visit) return;
    setForm({
      prisoner_id: visit.prisoner_id ?? "",
      visitor_name: visit.visitor_name ?? "",
      visit_date: visit.visit_date ? String(visit.visit_date).slice(0, 16) : "",
      status: visit.status ?? "Pending",
      notes: visit.notes ?? "",
    });
    setError("");
  }, [visit]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!visit) return;

    setLoading(true);
    setError("");

    const payload = {
      prisoner_id: form.prisoner_id ? Number(form.prisoner_id) : undefined,
      visitor_name: form.visitor_name || undefined,
      visit_date: form.visit_date || undefined,
      status: form.status || undefined,
      notes: form.notes || undefined,
    };

    // Remove undefined keys so we only send what user intended
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    try {
      await api.put(`/visits/${visit.visit_id}`, payload);
      showToast(`Visit #${visit.visit_id} updated`, "success");
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

  if (!visit) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Visit #{visit.visit_id}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Prisoner
            <select
              value={form.prisoner_id}
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })}
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
            Visitor Name
            <input
              value={form.visitor_name}
              onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
              required
            />
          </label>

          <label>
            Visit Date
            <input
              type="datetime-local"
              value={form.visit_date}
              onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              required
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>

          <label className="full-width">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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

export default function VisitsPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "Viewer";
  const isGuard = user?.role === "Guard";
  const isReadOnly = isViewer || isGuard;
  const [rows, setRows] = useState([]);
  const [prisoners, setPrisoners] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Per-row editing (new)
  const [editingVisit, setEditingVisit] = useState(null);

  // Real-time search term
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    try {
      const statusFilter = isReadOnly ? "Approved" : "Pending";
      const response = await api.get(`/visits?status_filter=${statusFilter}&today_only=false&page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const loadPendingRequests = async () => {
    if (isReadOnly) return;
    try {
      const response = await api.get("/visits/requests/pending");
      setPendingRequests(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  // Load prisoners (for name display + search + edit dropdown)
  const loadPrisoners = async () => {
    try {
      const response = await api.get(`/prisoners?page=1&page_size=300`);
      setPrisoners(response.data || []);
    } catch (err) {
      console.warn("Could not load prisoners for Visits page", err);
    }
  };

  useEffect(() => {
    load();
    loadPendingRequests();
    loadPrisoners();
  }, [page, isReadOnly]);

  // prisoner_id → name map
  const prisonerNameById = useMemo(() => {
    const map = {};
    prisoners.forEach((p) => {
      map[p.prisoner_id] = p.full_name;
    });
    return map;
  }, [prisoners]);

  // Real-time filtered list for main visits table
  const filteredRows = useMemo(() => {
    const q = searchTerm;
    if (!q || !q.trim()) return rows;

    return rows.filter((row) => {
      const prisonerName = prisonerNameById[row.prisoner_id] || "";
      return (
        includesText(prisonerName, q) ||
        includesText(row.visitor_name, q) ||
        includesText(row.notes, q) ||
        includesText(row.status, q) ||
        includesText(row.prisoner_id, q)
      );
    });
  }, [rows, searchTerm, prisonerNameById]);

  const approve = async (visitId) => {
    try {
      await api.put(`/visits/requests/${visitId}/approve`);
      await load();
      await loadPendingRequests();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const reject = async (requestId) => {
    const confirmed = window.confirm("Reject this visit request?");
    if (!confirmed) return;

    try {
      await api.put(`/visits/requests/${requestId}/reject`);
      await load();
      await loadPendingRequests();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const deleteVisit = async (visitId) => {
    const confirmed = window.confirm("Delete this visit permanently?");
    if (!confirmed) return;

    if (editingVisit?.visit_id === visitId) {
      setEditingVisit(null);
    }

    setError("");
    try {
      await api.delete(`/visits/${visitId}`);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const showToast = (message, type = "info") => setToast({ message, type });

  const canRequest = isViewer;
  const canManageVisits = !isReadOnly;

  const actions = [];
  if (canRequest) actions.push({ label: "Request Visit", onClick: () => setShowRequestModal(true) });
  if (canManageVisits) {
    actions.push({ label: "+ Create Visit", onClick: () => setShowCreateModal(true), variant: "create" });
    // Per-row Edit button in the table is now the recommended way (much better UX)
  }

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Actions" actions={actions} />
      </div>

      <div className="page-main-data">
      <section className="panel">
        <div className="panel-header">
          <h2>Visits</h2>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {/* Search bar + pagination (real-time filtering) */}
        <div className="inline-form" style={{ flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
            <input
              type="text"
              placeholder="Search by prisoner, visitor name, notes or status..."
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
            <button className="secondary-btn" onClick={() => setSearchTerm("")} style={{ marginLeft: "auto" }}>
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
                <th>Visitor</th>
                <th>Date</th>
                <th>Status</th>
                <th>Notes</th>
                {canManageVisits && <th style={{ width: "130px" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={canManageVisits ? 7 : 6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                    {searchTerm ? "No visits match your search." : "No visits found."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const prisonerName = prisonerNameById[row.prisoner_id];
                  return (
                    <tr key={row.visit_id}>
                      <td>{row.visit_id}</td>
                      <td>
                        {prisonerName ? (
                          <span>{prisonerName} <span className="muted">#{row.prisoner_id}</span></span>
                        ) : (
                          `#${row.prisoner_id}`
                        )}
                      </td>
                      <td>{row.visitor_name}</td>
                      <td>{String(row.visit_date || "").slice(0, 16)}</td>
                      <td>{row.status}</td>
                      <td style={{ maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.notes || "-"}
                      </td>

                      {canManageVisits && (
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-sm btn-edit"
                              onClick={() => setEditingVisit(row)}
                              title="Edit visit"
                            >
                              <Edit2 size={14} style={{ marginRight: 4 }} />
                              Edit
                            </button>

                            <button
                              className="btn-sm btn-delete"
                              onClick={() => deleteVisit(row.visit_id)}
                              title="Delete visit"
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
            Showing {filteredRows.length} of {rows.length} visits on this page (filtered).
          </p>
        )}
      </section>

      {!isReadOnly && pendingRequests.length > 0 && (
        <section className="panel">
          <h3>Pending visit requests</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Prisoner</th>
                  <th>Requested</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r) => (
                  <tr key={r.request_id}>
                    <td>{r.request_id}</td>
                    <td>{r.prisoner_id}</td>
                    <td>{String(r.requested_date || "").slice(0, 16)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-sm btn-edit" onClick={() => approve(r.request_id)}>Approve</button>
                        <button className="btn-sm btn-delete" onClick={() => reject(r.request_id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showRequestModal && (
        <RequestVisitModal onClose={() => setShowRequestModal(false)} onSaved={() => { setPage(1); load(); }} showToast={showToast} />
      )}
      {showCreateModal && canManageVisits && (
        <CreateVisitModal onClose={() => setShowCreateModal(false)} onSaved={() => { setPage(1); load(); }} showToast={showToast} />
      )}

      {/* NEW: Per-row Edit Visit Modal (pre-filled).
          Modal fetches its own prisoner list via useEffect when opened. */}
      {editingVisit && canManageVisits && (
        <EditVisitModal
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
