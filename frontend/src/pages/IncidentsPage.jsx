import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  prisoner_id: 1,
  location_id: 1,
  incident_date: new Date().toISOString().slice(0, 16),
  incident_type: "",
  severity: "Medium",
  penalty_points: 0,
  description: "",
};

export default function IncidentsPage() {
  const { user } = useAuth();
  const isGuard = user?.role === "Guard";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [updateForm, setUpdateForm] = useState({
    incident_id: "",
    prisoner_id: "",
    location_id: "",
    incident_date: "",
    incident_type: "",
    severity: "",
    penalty_points: "",
    description: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

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

  const create = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/incidents", {
        ...form,
        prisoner_id: Number(form.prisoner_id),
        location_id: Number(form.location_id),
        penalty_points: Number(form.penalty_points),
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const updateIncident = async (event) => {
    event.preventDefault();
    setError("");
    if (!updateForm.incident_id) {
      setError("Incident ID is required");
      return;
    }

    const payload = {};
    if (updateForm.prisoner_id) payload.prisoner_id = Number(updateForm.prisoner_id);
    if (updateForm.location_id) payload.location_id = Number(updateForm.location_id);
    if (updateForm.incident_date) payload.incident_date = updateForm.incident_date;
    if (updateForm.incident_type) payload.incident_type = updateForm.incident_type;
    if (updateForm.severity) payload.severity = updateForm.severity;
    if (updateForm.penalty_points !== "") payload.penalty_points = Number(updateForm.penalty_points);
    if (updateForm.description) payload.description = updateForm.description;

    try {
      await api.put(`/incidents/${Number(updateForm.incident_id)}`, payload);
      setUpdateForm({
        incident_id: "",
        prisoner_id: "",
        location_id: "",
        incident_date: "",
        incident_type: "",
        severity: "",
        penalty_points: "",
        description: "",
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

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

  return (
    <div className="split-grid">
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
      {!isGuard && (
        <section className="panel">
          <h2>Create incident</h2>
          <form className="form-grid" onSubmit={create}>
            <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
            <label>Location ID<input type="number" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} required /></label>
            <label>Incident date<input type="datetime-local" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} required /></label>
            <label>Type<input value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })} /></label>
            <label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label>Penalty<input type="number" value={form.penalty_points} onChange={(e) => setForm({ ...form, penalty_points: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Create</button>
          </form>
        </section>
      )}

      {!isGuard && (
        <section className="panel">
          <h2>Update incident</h2>
          <form className="form-grid" onSubmit={updateIncident}>
            <label>Incident ID<input type="number" value={updateForm.incident_id} onChange={(e) => setUpdateForm({ ...updateForm, incident_id: e.target.value })} required /></label>
            <label>Prisoner ID<input type="number" value={updateForm.prisoner_id} onChange={(e) => setUpdateForm({ ...updateForm, prisoner_id: e.target.value })} /></label>
            <label>Location ID<input type="number" value={updateForm.location_id} onChange={(e) => setUpdateForm({ ...updateForm, location_id: e.target.value })} /></label>
            <label>Incident date<input type="datetime-local" value={updateForm.incident_date} onChange={(e) => setUpdateForm({ ...updateForm, incident_date: e.target.value })} /></label>
            <label>Type<input value={updateForm.incident_type} onChange={(e) => setUpdateForm({ ...updateForm, incident_type: e.target.value })} /></label>
            <label>Severity<select value={updateForm.severity} onChange={(e) => setUpdateForm({ ...updateForm, severity: e.target.value })}><option value="">(no change)</option><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label>Penalty<input type="number" value={updateForm.penalty_points} onChange={(e) => setUpdateForm({ ...updateForm, penalty_points: e.target.value })} /></label>
            <label>Description<textarea value={updateForm.description} onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Update</button>
          </form>
        </section>
      )}
    </div>
  );
}
