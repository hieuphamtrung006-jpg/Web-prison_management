import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

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
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/incidents");
      setRows(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="split-grid">
      <section className="panel">
        <h2>Incidents</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Prisoner</th><th>Severity</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.incident_id}><td>{row.incident_id}</td><td>{row.prisoner_id}</td><td>{row.severity}</td><td>{String(row.incident_date).slice(0, 10)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
    </div>
  );
}
