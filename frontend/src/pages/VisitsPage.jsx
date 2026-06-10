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

function RequestVisitModal({ onClose, onSaved, showToast, initialPrisonerId }) {
  const [form, setForm] = useState({
    ...initialRequestForm,
    prisoner_id: initialPrisonerId || initialRequestForm.prisoner_id,
  });
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
          <label>
            Prisoner ID
            <input 
              type="number" 
              value={form.prisoner_id} 
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} 
              required 
              disabled={!!initialPrisonerId} // For Viewer, pre-selected via modal
            />
            {initialPrisonerId && <span className="hint-text" style={{fontSize: '0.75rem'}}> (Selected via search)</span>}
          </label>
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

/**
 * Modal for Viewer to search and select a prisoner when creating a Visit Request.
 * This avoids requiring the user to know the Prisoner ID in advance.
 * Uses client-side search on the loaded prisoners list (Basic view for Viewer).
 */
function PrisonerSelectorModal({ onClose, onSelect, prisoners, searchTerm, setSearchTerm }) {
  const filteredPrisoners = prisoners.filter((p) =>
    includesText(p.full_name, searchTerm) ||
    includesText(p.risk_level, searchTerm) ||
    includesText(String(p.prisoner_id), searchTerm)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Prisoner</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: "16px" }}>
          <input
            type="text"
            placeholder="Search by name, risk level or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", marginBottom: "12px" }}
          />

          <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "8px" }}>
            {filteredPrisoners.length > 0 ? (
              filteredPrisoners.map((p) => (
                <div
                  key={p.prisoner_id}
                  onClick={() => onSelect(p.prisoner_id)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  className="hover:bg-[var(--bg-elevated)]"
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.full_name} <span className="muted">(#{p.prisoner_id})</span></div>
                    <div style={{ fontSize: "0.8rem", marginTop: 2 }}>
                      Risk: <span className={`status-badge risk-${(p.risk_level || '').toLowerCase()}`}>{p.risk_level || "N/A"}</span>
                      {p.current_location_name && ` • ${p.current_location_name}`}
                    </div>
                  </div>
                  <button className="btn-sm btn-edit" style={{ pointerEvents: "none" }}>Select</button>
                </div>
              ))
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                No prisoners found matching your search.
              </div>
            )}
          </div>

          <div style={{ marginTop: "12px", fontSize: "0.75rem", color: "var(--muted)" }}>
            Select a prisoner to continue with your visit request.
          </div>
        </div>

        <div className="modal-buttons" style={{ padding: "0 16px 16px" }}>
          <button className="secondary-btn" type="button" onClick={onClose}>Cancel</button>
        </div>
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

  // Dedicated state for the Prisoner dropdown inside this modal.
  // Fetch when the modal opens (when `visit` prop is provided).
  const [dropdownPrisoners, setDropdownPrisoners] = useState([]);
  const [loadingPrisoners, setLoadingPrisoners] = useState(false);

  // Load prisoners for the dropdown when Edit modal opens.
  useEffect(() => {
    const loadDropdownPrisoners = async () => {
      if (!visit) return;
      setLoadingPrisoners(true);
      try {
        const response = await api.get(`/prisoners?page=1&page_size=100`);
        const list = response.data || [];
        setDropdownPrisoners(list);
        console.log("[EditVisitModal] Prisoners loaded for dropdown:", list.length);
      } catch (err) {
        console.error("[EditVisitModal] Failed to load prisoners:", err);
      } finally {
        setLoadingPrisoners(false);
      }
    };

    loadDropdownPrisoners();
  }, [visit]);

  // Prefill form when the visit being edited changes.
  // The prisoner_id set here will cause the <select> to pre-select the correct option.
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
              required
              disabled={loadingPrisoners}
            >
              <option value="">Select prisoner</option>
              {loadingPrisoners && (
                <option value="" disabled>Loading prisoners...</option>
              )}
              {!loadingPrisoners && dropdownPrisoners.length === 0 && (
                <option value="" disabled>No prisoners loaded (check console for errors)</option>
              )}
              {dropdownPrisoners.map((p) => (
                <option key={p.prisoner_id} value={p.prisoner_id}>
                  {p.full_name} (#{p.prisoner_id})
                </option>
              ))}
            </select>
            {loadingPrisoners && <span style={{ fontSize: "0.8rem", marginLeft: "8px", color: "var(--muted)" }}>Loading...</span>}
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

/**
 * Modal for Viewer to view their own Visit Request details.
 * Follows the same dark modal pattern as other modals in the app.
 */
function MyRequestDetailModal({ request, onClose, prisonerNameById }) {
  if (!request) return null;

  const prisonerName = prisonerNameById[request.prisoner_id] 
    ? `${prisonerNameById[request.prisoner_id]} (#${request.prisoner_id})` 
    : `#${request.prisoner_id}`;

  const getStatusBadgeClass = (status) => {
    if (status === "Approved") return "status-active";
    if (status === "Rejected") return "status-inactive";
    return ""; // Pending - default style
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request Detail #{request.request_id}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Detail rows using similar structure to other detail modals */}
          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Prisoner</span>
            <strong>{prisonerName}</strong>
          </div>

          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Visit Date</span>
            <strong>{String(request.requested_date || "").slice(0, 16)}</strong>
          </div>

          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Status</span>
            <div>
              <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                {request.status}
              </span>
            </div>
          </div>

          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Notes</span>
            <strong style={{ whiteSpace: "pre-wrap" }}>
              {request.notes || "Không có ghi chú"}
            </strong>
          </div>
        </div>

        <div className="modal-buttons" style={{ padding: "0 24px 20px" }}>
          <button className="secondary-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
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
  // For Viewer: prisoner selector modal before creating request
  const [showPrisonerSelector, setShowPrisonerSelector] = useState(false);
  const [prisonerSearchTerm, setPrisonerSearchTerm] = useState("");
  const [pendingRequestPrisonerId, setPendingRequestPrisonerId] = useState(null);

  // Load prisoners on mount if not already (needed for prisoner selector in request flow)
  // The existing loadPrisoners in useEffect handles this.

  // Per-row editing (new)
  const [editingVisit, setEditingVisit] = useState(null);

  // Real-time search term
  const [searchTerm, setSearchTerm] = useState("");
  // For Viewer: their own submitted requests with status
  const [myRequests, setMyRequests] = useState([]);
  // Selected request for detail modal (Viewer only)
  const [viewingRequest, setViewingRequest] = useState(null);

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

  // For Viewer: load only their own requests (using the new /requests/mine endpoint)
  const loadMyRequests = async () => {
    if (!isViewer) return;
    try {
      const response = await api.get("/visits/requests/mine");
      setMyRequests(response.data || []);
    } catch (err) {
      // Non-fatal for Viewer
      console.warn("Could not load my visit requests", err);
    }
  };

  // Load prisoners (for name display in table + search + Edit modal dropdown).
  // Loaded at page level following patterns from LaborPage etc.
  const loadPrisoners = async () => {
    try {
      const response = await api.get(`/prisoners?page=1&page_size=100`);
      setPrisoners(response.data || []);
      console.log("[VisitsPage] Parent prisoners loaded:", (response.data || []).length);
    } catch (err) {
      console.error("[VisitsPage] Failed to load prisoners for table:", err);
    }
  };

  // Load visits rows (depends on page + role)
  useEffect(() => {
    load();
    if (!isReadOnly) {
      loadPendingRequests();
    } else if (isViewer) {
      loadMyRequests();
    }
  }, [page, isReadOnly]);

  // Load prisoners once on mount
  useEffect(() => {
    loadPrisoners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load my requests on mount for Viewer
  useEffect(() => {
    if (isViewer) {
      loadMyRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewer]);

  // Ensure we refresh the prisoners list (for table names + search) when Edit is opened.
  // The Edit modal fetches its own list independently for the dropdown.
  useEffect(() => {
    if (editingVisit) {
      loadPrisoners();
    }
  }, [editingVisit]);

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

  // Filtered list for Viewer's own requests (client-side search)
  const filteredMyRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return myRequests;

    return myRequests.filter((r) => {
      const prisonerName = prisonerNameById[r.prisoner_id] || "";
      return (
        includesText(prisonerName, q) ||
        includesText(r.status, q) ||
        includesText(String(r.requested_date || ""), q) ||
        includesText(r.request_id, q)
      );
    });
  }, [myRequests, searchTerm, prisonerNameById]);

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
  if (canRequest) {
    // For Viewer: first open the prisoner search/selector modal (no need to manually enter ID)
    actions.push({ 
      label: "Request Visit", 
      onClick: () => setShowPrisonerSelector(true) 
    });
  }
  if (canManageVisits) {
    actions.push({ label: "+ Create Visit", onClick: () => setShowCreateModal(true), variant: "create" });
    // Per-row Edit button in the table is now the recommended way (much better UX)
  }

  // Note: Viewer flow for request creation is: Request Visit -> PrisonerSelectorModal -> RequestVisitModal (with prefilled ID)

  // Note: For Viewer, the main content is "My Visit Requests" (see branched panel below).
  // Request creation will auto-refresh the list via onSaved in the modal.

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Actions" actions={actions} />
      </div>

      <div className="page-main-data">
      <section className="panel">
        <div className="panel-header">
          <h2>{isViewer ? "My Visit Requests" : "Visits"}</h2>
        </div>

        {isViewer && (
          <p className="hint-text">
            Các yêu cầu thăm gặp bạn đã gửi. Trạng thái sẽ được cập nhật sau khi được duyệt.
          </p>
        )}

        {error && <p className="error-msg">{error}</p>}

        {/* Search bar + pagination (real-time filtering). For Viewer, search applies to their own requests. */}
        <div className="inline-form" style={{ flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
            <input
              type="text"
              placeholder={isViewer ? "Search your requests by prisoner, date or status..." : "Search by prisoner, visitor name, notes or status..."}
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

          {/* Pagination controls only relevant for staff visits list */}
          {!isViewer && (
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
          )}

          {searchTerm && (
            <button className="secondary-btn" onClick={() => setSearchTerm("")} style={{ marginLeft: "auto" }}>
              Clear search
            </button>
          )}
        </div>

        {/* Role-based main content */}
        {isViewer ? (
          /* Viewer: My Visit Requests table (only their own) */
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Prisoner</th>
                  <th>Visit Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                      {searchTerm 
                        ? "No matching requests found." 
                        : <>Bạn chưa có yêu cầu thăm gặp nào.<br />Nhấn nút <strong>“Request Visit”</strong> để tạo đơn mới.</>}
                    </td>
                  </tr>
                ) : (
                  filteredMyRequests.map((r) => {
                    const prisonerName = prisonerNameById[r.prisoner_id] || `#${r.prisoner_id}`;
                    return (
                      <tr key={r.request_id}>
                        <td>{r.request_id}</td>
                        <td>{prisonerName}</td>
                        <td>{String(r.requested_date || "").slice(0, 16)}</td>
                        <td>
                          <span className={`status-badge ${r.status === "Approved" ? "status-active" : r.status === "Rejected" ? "status-inactive" : ""}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.notes || "-"}
                        </td>
                        <td>
                          <button 
                            className="btn-sm btn-edit" 
                            onClick={() => setViewingRequest(r)}
                            title="View request details"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Staff: original visits table */
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
        )}

        {/* Showing count */}
        {isViewer ? (
          searchTerm && filteredMyRequests.length < myRequests.length && (
            <p className="muted" style={{ marginTop: "8px", fontSize: "0.85rem" }}>
              Showing {filteredMyRequests.length} of {myRequests.length} of your requests (filtered).
            </p>
          )
        ) : (
          searchTerm && filteredRows.length < rows.length && (
            <p className="muted" style={{ marginTop: "8px", fontSize: "0.85rem" }}>
              Showing {filteredRows.length} of {rows.length} visits on this page (filtered).
            </p>
          )
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
        <RequestVisitModal 
          onClose={() => {
            setShowRequestModal(false);
            setPendingRequestPrisonerId(null); // clear if cancelled
          }} 
          onSaved={() => { 
            setPage(1); 
            load(); 
            if (isViewer) loadMyRequests(); 
            setPendingRequestPrisonerId(null); // clear after use
          }} 
          showToast={showToast} 
          initialPrisonerId={pendingRequestPrisonerId} // pre-filled from selector
        />
      )}

      {/* Prisoner selector modal - only for Viewer when creating request */}
      {isViewer && showPrisonerSelector && (
        <PrisonerSelectorModal
          onClose={() => {
            setShowPrisonerSelector(false);
            setPrisonerSearchTerm("");
          }}
          onSelect={(prisonerId) => {
            // Pre-fill the prisoner and open the request form
            setPendingRequestPrisonerId(prisonerId);
            setShowPrisonerSelector(false);
            setPrisonerSearchTerm("");
            setShowRequestModal(true);
          }}
          prisoners={prisoners}
          searchTerm={prisonerSearchTerm}
          setSearchTerm={setPrisonerSearchTerm}
        />
      )}
      {showCreateModal && canManageVisits && (
        <CreateVisitModal onClose={() => setShowCreateModal(false)} onSaved={() => { setPage(1); load(); }} showToast={showToast} />
      )}

      {/* Edit Visit Modal - fetches its own prisoners list on open via useEffect([visit]) */}
      {editingVisit && canManageVisits && (
        <EditVisitModal
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {/* Viewer-only: Beautiful modal for viewing own request details */}
      {isViewer && viewingRequest && (
        <MyRequestDetailModal
          request={viewingRequest}
          onClose={() => setViewingRequest(null)}
          prisonerNameById={prisonerNameById}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
