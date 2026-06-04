import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import ActionSidebar from "../components/ActionSidebar";
import { useAuth } from "../context/AuthContext";

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

function UpdateVisitModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({ visit_id: "", prisoner_id: "", visitor_name: "", visit_date: "", status: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); setError("");
    if (!form.visit_id) { setError("Visit ID required"); setLoading(false); return; }
    const payload = {};
    if (form.prisoner_id) payload.prisoner_id = Number(form.prisoner_id);
    if (form.visitor_name) payload.visitor_name = form.visitor_name;
    if (form.visit_date) payload.visit_date = form.visit_date;
    if (form.status) payload.status = form.status;
    if (form.notes) payload.notes = form.notes;
    try {
      await api.put(`/visits/${Number(form.visit_id)}`, payload);
      showToast("Visit updated", "success");
      setForm({ visit_id: "", prisoner_id: "", visitor_name: "", visit_date: "", status: "", notes: "" });
      onSaved();
      onClose();
    } catch (err) {
      const m = parseApiError(err); setError(m); showToast(m, "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Update Visit</h3><button className="close-btn" onClick={onClose}>×</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Visit ID<input type="number" value={form.visit_id} onChange={(e) => setForm({ ...form, visit_id: e.target.value })} required /></label>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} /></label>
          <label>Visitor<input value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} /></label>
          <label>Date<input type="datetime-local" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="">(no change)</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
          <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Saving..." : "Update"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
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
  const [pendingRequests, setPendingRequests] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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

  useEffect(() => {
    load();
    loadPendingRequests();
  }, [page, isReadOnly]);

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
    actions.push({ label: "✎ Update Visit", onClick: () => setShowUpdateModal(true), variant: "update" });
  }

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Actions" actions={actions} />
      </div>

      <div className="page-main-data">
      <section className="panel">
        <h2>Visits</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
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
                {!isReadOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.visit_id}>
                  <td>{row.visit_id}</td>
                  <td>{row.prisoner_id}</td>
                  <td>{row.visitor_name}</td>
                  <td>{String(row.visit_date || "").slice(0, 16)}</td>
                  <td>{row.status}</td>
                  {!isReadOnly && (
                    <td>
                      <button className="btn-sm btn-delete" onClick={() => deleteVisit(row.visit_id)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      {showUpdateModal && canManageVisits && (
        <UpdateVisitModal onClose={() => setShowUpdateModal(false)} onSaved={() => load()} showToast={showToast} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
