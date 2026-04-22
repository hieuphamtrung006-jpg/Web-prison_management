import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

const initialForm = {
  prisoner_id: 1,
  visitor_name: "",
  visit_date: new Date().toISOString().slice(0, 16),
  notes: "",
};

export default function VisitsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/visits?status_filter=Pending&today_only=false");
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
      await api.post("/visits", { ...form, prisoner_id: Number(form.prisoner_id) });
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const approve = async (visitId) => {
    try {
      await api.put(`/visits/${visitId}/approve`);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="split-grid">
      <section className="panel">
        <h2>Visit Requests</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Prisoner</th><th>Visitor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.visit_id}>
                  <td>{row.visit_id}</td><td>{row.prisoner_id}</td><td>{row.visitor_name}</td><td>{row.status}</td>
                  <td>{row.status === "Pending" && <button className="secondary-btn" onClick={() => approve(row.visit_id)}>Approve</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Create Visit</h2>
        <form className="form-grid" onSubmit={create}>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
          <label>Visitor<input value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} required /></label>
          <label>Date<input type="datetime-local" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required /></label>
          <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="primary-btn" type="submit">Create</button>
        </form>
      </section>
    </div>
  );
}
