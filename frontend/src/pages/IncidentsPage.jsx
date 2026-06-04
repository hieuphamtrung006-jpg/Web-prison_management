import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";

const initialForm = {
  prisoner_id: 1,
  location_id: 1,
  incident_date: new Date().toISOString().slice(0, 16),
  incident_type: "",
  severity: "Medium",
  penalty_points: 0,
  description: "",
};

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

function UpdateIncidentModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    incident_id: "",
    prisoner_id: "",
    location_id: "",
    incident_date: "",
    incident_type: "",
    severity: "",
    penalty_points: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (!form.incident_id) {
      setError("Incident ID is required");
      setLoading(false);
      return;
    }
    const payload = {};
    if (form.prisoner_id) payload.prisoner_id = Number(form.prisoner_id);
    if (form.location_id) payload.location_id = Number(form.location_id);
    if (form.incident_date) payload.incident_date = form.incident_date;
    if (form.incident_type) payload.incident_type = form.incident_type;
    if (form.severity) payload.severity = form.severity;
    if (form.penalty_points !== "") payload.penalty_points = Number(form.penalty_points);
    if (form.description) payload.description = form.description;

    try {
      await api.put(`/incidents/${Number(form.incident_id)}`, payload);
      showToast("Incident updated", "success");
      setForm({
        incident_id: "", prisoner_id: "", location_id: "", incident_date: "", incident_type: "", severity: "", penalty_points: "", description: "",
      });
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
          <h3>Update Incident</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Incident ID<input type="number" value={form.incident_id} onChange={(e) => setForm({ ...form, incident_id: e.target.value })} required /></label>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} /></label>
          <label>Location ID<input type="number" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} /></label>
          <label>Incident date<input type="datetime-local" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></label>
          <label>Type<input value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })} /></label>
          <label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option value="">(no change)</option><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label>Penalty<input type="number" value={form.penalty_points} onChange={(e) => setForm({ ...form, penalty_points: e.target.value })} /></label>
          <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Saving..." : "Update"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
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
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const load = async () => {
    try {
      const response = await api.get(`/incidents?page=${page}&page_size=${pageSize}`);
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const deleteIncident = async (incidentId) => {
    const confirmed = window.confirm("Delete this incident permanently?");
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/incidents/${incidentId}`);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const canManage = !isGuard;
  const createActions = canManage
    ? [
        { label: "+ Create Incident", onClick: () => setShowCreateModal(true), variant: "create" },
        { label: "✎ Update Incident", onClick: () => setShowUpdateModal(true), variant: "update" },
      ]
    : [];

  const showToast = (message, type = "info") => setToast({ message, type });

  return (
    <div>
      <ActionSidebar title="Actions" actions={createActions} position="left-rail" />

      <div className="content-with-rail">
      <section className="panel">
        <h2>Incidents</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Prisoner</th><th>Severity</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.incident_id}>
                  <td>{row.incident_id}</td>
                  <td>{row.prisoner_id}</td>
                  <td>{row.severity}</td>
                  <td>{String(row.incident_date).slice(0, 10)}</td>
                  <td><button className="danger-btn" onClick={() => deleteIncident(row.incident_id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal && canManage && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {showUpdateModal && canManage && (
        <UpdateIncidentModal
          onClose={() => setShowUpdateModal(false)}
          onSaved={() => load()}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
