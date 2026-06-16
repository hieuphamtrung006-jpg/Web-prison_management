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
        <div className="modal-header"><h3>Tạo Yêu cầu Thăm gặp</h3><button className="close-btn" onClick={onClose}>×</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Mã Tù nhân
            <input 
              type="number" 
              value={form.prisoner_id} 
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} 
              required 
              disabled={!!initialPrisonerId} // For Viewer, pre-selected via modal
            />
            {initialPrisonerId && <span className="hint-text" style={{fontSize: '0.75rem'}}> (Đã chọn qua tìm kiếm)</span>}
          </label>
          <label>Ngày yêu cầu<input type="datetime-local" value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })} required /></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Đang gửi..." : "Gửi Yêu cầu"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Hủy</button>
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
          <h3>Chọn Tù nhân</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: "16px" }}>
          <input
            type="text"
            placeholder="Tìm theo tên, mức rủi ro hoặc ID..."
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
                  <button className="btn-sm btn-edit" style={{ pointerEvents: "none" }}>Chọn</button>
                </div>
              ))
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                Không tìm thấy tù nhân nào khớp tìm kiếm của bạn.
              </div>
            )}
          </div>

          <div style={{ marginTop: "12px", fontSize: "0.75rem", color: "var(--muted)" }}>
            Chọn một tù nhân để tiếp tục yêu cầu thăm gặp của bạn.
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
        <div className="modal-header"><h3>Tạo Thăm gặp</h3><button className="close-btn" onClick={onClose}>×</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Mã Tù nhân<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
          <label>Người thăm<input value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} required /></label>
          <label>Ngày<input type="datetime-local" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required /></label>
          <label>Ghi chú<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Đang tạo..." : "Tạo"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Hủy</button>
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
          <h3>Sửa Thăm gặp #{visit.visit_id}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Tù nhân
            <select
              value={form.prisoner_id}
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })}
              required
              disabled={loadingPrisoners}
            >
              <option value="">Chọn tù nhân</option>
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
            Tên Người thăm
            <input
              value={form.visitor_name}
              onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
              required
            />
          </label>

          <label>
            Ngày Thăm
            <input
              type="datetime-local"
              value={form.visit_date}
              onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              required
            />
          </label>

          <label>
            Trạng thái
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Chờ duyệt</option>
              <option>Đã phê duyệt</option>
              <option>Đã từ chối</option>
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
          <h3>Chi tiết Yêu cầu #{request.request_id}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Detail rows using similar structure to other detail modals */}
          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Tù nhân</span>
            <strong>{prisonerName}</strong>
          </div>

          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Ngày Thăm</span>
            <strong>{String(request.requested_date || "").slice(0, 16)}</strong>
          </div>

          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Trạng thái</span>
            <div>
              <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                {request.status}
              </span>
            </div>
          </div>

          <div className="detail-item" style={{ marginBottom: "8px" }}>
            <span>Ghi chú</span>
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

  // Role-based permissions for Visits (using current_user.role)
  // - Viewer: only personal requests (read-only, create request only)
  // - Guard: operational - can view all, create manual Visit, edit Visit, approve/reject requests. NO delete Visit, NO create Request.
  // - Warden/Admin: full control (create, edit, delete, approve, etc.)
  const canCreateVisit = !isViewer; // Guard + higher: create manual (approved) Visit
  const canRequestVisit = isViewer; // Only Viewer creates "Visit Request"
  const canEditVisit = !isViewer;   // Guard + higher
  const canDeleteVisit = !isViewer && !isGuard; // Only Warden/Admin
  const canApproveReject = !isViewer; // Guard + higher can duyệt/từ chối request

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

  // Per-row editing (new)
  const [editingVisit, setEditingVisit] = useState(null);

  // Real-time search term
  const [searchTerm, setSearchTerm] = useState("");
  // For Viewer: their own submitted requests with status
  const [myRequests, setMyRequests] = useState([]);
  // Selected request for detail modal (Viewer only)
  const [viewingRequest, setViewingRequest] = useState(null);

  // Filters for staff/Guard table: status (server via load), prisoner + date (client)
  const [filterStatus, setFilterStatus] = useState("Approved");
  const [filterPrisonerId, setFilterPrisonerId] = useState("");
  const [filterDate, setFilterDate] = useState("");

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

  // Load visits rows.
  // For Guard/staff: use filterStatus so user can filter by trạng thái (server-side).
  // Viewer always sees only Approved.
  const load = async () => {
    try {
      const statusToLoad = isViewer ? "Approved" : filterStatus;
      const response = await api.get(`/visits?status_filter=${statusToLoad}&today_only=false&page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const loadPendingRequests = async () => {
    if (isViewer) return; // Guard + higher can see and manage pending requests
    try {
      const response = await api.get("/visits/requests/pending");
      setPendingRequests(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  // Load visits + pending (when page or status filter changes)
  useEffect(() => {
    load();
    if (!isViewer) {
      loadPendingRequests();
    } else if (isViewer) {
      loadMyRequests();
    }
  }, [page, filterStatus, isViewer]);

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

  // Real-time filtered list for main visits table (staff/Guard)
  // status is handled by server via filterStatus, prisoner and date are client-side
  const filteredRows = useMemo(() => {
    let result = rows;

    if (filterPrisonerId) {
      result = result.filter((row) => String(row.prisoner_id) === String(filterPrisonerId));
    }
    if (filterDate) {
      result = result.filter((row) => String(row.visit_date || "").slice(0, 10) === filterDate);
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => {
        const prisonerName = prisonerNameById[row.prisoner_id] || "";
        return (
          includesText(prisonerName, q) ||
          includesText(row.visitor_name, q) ||
          includesText(row.notes, q) ||
          includesText(row.status, q) ||
          includesText(row.prisoner_id, q)
        );
      });
    }

    return result;
  }, [rows, searchTerm, prisonerNameById, filterPrisonerId, filterDate]);

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
    const confirmed = window.confirm("Từ chối yêu cầu thăm gặp này?");
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
    const confirmed = window.confirm("Xóa thăm gặp này vĩnh viễn?");
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

  // Sidebar actions - strictly controlled by role (no duplicate flags)
  const actions = [];
  if (canRequestVisit) {
    // Only Viewer can create "Visit Request" (personal request flow)
    actions.push({ 
      label: "Yêu cầu Thăm gặp", 
      onClick: () => setShowPrisonerSelector(true) 
    });
  }
  if (canCreateVisit) {
    // Guard + Warden + Admin can create manual Visit (thủ công)
    actions.push({ label: "+ Tạo Thăm gặp", onClick: () => setShowCreateModal(true), variant: "create" });
  }

  // Guard can see and manage the Pending requests section (Duyệt / Từ chối).

  // Note: Viewer flow for request creation is: Request Visit -> PrisonerSelectorModal -> RequestVisitModal (with prefilled ID)

  // Note: For Viewer, the main content is "My Visit Requests" (see branched panel below).
  // Request creation will auto-refresh the list via onSaved in the modal.

  // Layout improvement: if no sidebar actions (or very limited create), hide the left column
  // and expand the main content area (đẩy thông tin sang, table wider, less wasted space).
  const hasSidebarActions = actions.length > 0;

  return (
    <div className="page-action-layout">
      {/* Hide left sidebar when no actions for the role (e.g. very limited create).
         This expands the main data area (đẩy trường thông tin sang, table + filters wider and cleaner). */}
      {hasSidebarActions && (
        <div className="page-action-column">
          <ActionSidebar title="Hành động" actions={actions} />
        </div>
      )}

      <div className="page-main-data" style={!hasSidebarActions ? { marginLeft: 0 } : {}}>
      <section className="panel" style={!hasSidebarActions ? { paddingTop: '8px', paddingBottom: '8px' } : {}}>
        <div className="panel-header">
          <h2>{isViewer ? "Yêu cầu Thăm gặp Của Tôi" : "Thăm gặp"}</h2>
        </div>

        {isViewer && (
          <p className="hint-text">
            Các yêu cầu thăm gặp bạn đã gửi. Trạng thái sẽ được cập nhật sau khi được duyệt.
          </p>
        )}

        {error && <p className="error-msg">{error}</p>}

        {/* Search bar + pagination + explicit filters for Guard (trạng thái, tù nhân, ngày) */}
        <div className="inline-form" style={{ flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
            <input
              type="text"
              placeholder={isViewer ? "Tìm yêu cầu của bạn theo tù nhân, ngày hoặc trạng thái..." : "Tìm theo tù nhân, tên người thăm, ghi chú hoặc trạng thái..."}
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
                Trước
              </button>
              <span className="muted">Trang {page}</span>
              <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>
                Sau
              </button>
            </div>
          )}

          {searchTerm && (
            <button className="secondary-btn" onClick={() => setSearchTerm("")} style={{ marginLeft: "auto" }}>
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Dedicated filters for Guard: status (drives server load), prisoner and date (client-side) */}
        {!isViewer && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px", alignItems: "flex-end" }}>
            <label style={{ minWidth: 140 }}>
              Trạng thái
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  if (page !== 1) setPage(1);
                }}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </label>

            <label style={{ minWidth: 180 }}>
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
              Ngày
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

            {(filterPrisonerId || filterDate || searchTerm) && (
              <button
                className="secondary-btn"
                onClick={() => {
                  setFilterPrisonerId("");
                  setFilterDate("");
                  setSearchTerm("");
                  if (page !== 1) setPage(1);
                }}
              >
                Xóa filter
              </button>
            )}
          </div>
        )}

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
                        ? "Không tìm thấy yêu cầu nào khớp." 
                        : <>Bạn chưa có yêu cầu thăm gặp nào.<br />Nhấn nút <strong>“Yêu cầu Thăm gặp”</strong> để tạo đơn mới.</>}
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
                            title="Xem chi tiết yêu cầu"
                          >
                            Xem
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
                  {/* Actions column only if Guard or higher has edit/delete rights */}
                  {(canEditVisit || canDeleteVisit) && <th style={{ width: "130px" }}>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    {/* Always 7 columns when Actions are possible; Guard has Edit but no Delete, so still show the column */}
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                      {searchTerm ? "Không có thăm gặp nào khớp tìm kiếm của bạn." : "Không tìm thấy thăm gặp nào."}
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

                        {/* Guard: only Edit (no Delete). Warden/Admin: full Edit + Delete. */}
                        {(canEditVisit || canDeleteVisit) && (
                          <td>
                            <div className="table-actions">
                              {canEditVisit && (
                                <button
                                  className="btn-sm btn-edit"
                                  onClick={() => setEditingVisit(row)}
                                  title="Sửa thăm gặp"
                                >
                                  <Edit2 size={14} style={{ marginRight: 4 }} />
                                  Sửa
                                </button>
                              )}

                              {canDeleteVisit && (
                                <button
                                  className="btn-sm btn-delete"
                                  onClick={() => deleteVisit(row.visit_id)}
                                  title="Xóa thăm gặp"
                                >
                                  <Trash2 size={14} style={{ marginRight: 4 }} />
                                  Xóa
                                </button>
                              )}
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

      {/* Pending visit requests section - visible for Guard (canApproveReject) and higher roles */}
      {!isViewer && pendingRequests.length > 0 && (
        <section className="panel">
          <h3>Yêu cầu thăm gặp đang chờ</h3>
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
                      {/* Guard + higher can Duyệt/Từ chối. Controlled by canApproveReject. */}
                      {canApproveReject && (
                        <div className="table-actions">
                          <button className="btn-sm btn-edit" onClick={() => approve(r.request_id)}>Phê duyệt</button>
                          <button className="btn-sm btn-delete" onClick={() => reject(r.request_id)}>Từ chối</button>
                        </div>
                      )}
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
      {/* Create Visit (manual thủ công) - only for roles with canCreateVisit (Guard + higher).
         Viewer cannot create manual Visit, only Request. */}
      {showCreateModal && canCreateVisit && (
        <CreateVisitModal onClose={() => setShowCreateModal(false)} onSaved={() => { setPage(1); load(); }} showToast={showToast} />
      )}

      {/* Edit Visit Modal - Guard + higher (canEditVisit). Guard can edit visits they manage. */}
      {editingVisit && canEditVisit && (
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
