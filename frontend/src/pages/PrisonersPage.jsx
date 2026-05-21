import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  full_name: "",
  date_of_birth: "1995-01-01",
  gender: "Male",
  crime_type: "",
  risk_level: "Low",
  rehab_hours: 0,
  current_location_id: 1,
  sentence_start: "2026-01-01",
  sentence_end: "2028-01-01",
  status: "InPrison",
};

export default function PrisonersPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "Viewer";
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [updateForm, setUpdateForm] = useState({
    prisoner_id: "",
    full_name: "",
    risk_level: "",
    status: "",
    current_location_id: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/prisoners?page=${page}&page_size=${pageSize}`);
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
      await api.post("/prisoners", {
        ...form,
        rehab_hours: Number(form.rehab_hours),
        current_location_id: Number(form.current_location_id),
      });
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const update = async (event) => {
    event.preventDefault();
    setError("");
    if (!updateForm.prisoner_id) {
      setError("Prisoner ID is required");
      return;
    }

    const payload = {};
    if (updateForm.full_name) payload.full_name = updateForm.full_name;
    if (updateForm.risk_level) payload.risk_level = updateForm.risk_level;
    if (updateForm.status) payload.status = updateForm.status;
    if (updateForm.current_location_id) {
      payload.current_location_id = Number(updateForm.current_location_id);
    }

    try {
      await api.put(`/prisoners/${Number(updateForm.prisoner_id)}`, payload);
      setUpdateForm({ prisoner_id: "", full_name: "", risk_level: "", status: "", current_location_id: "" });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const deletePrisoner = async (prisonerId) => {
    const confirmed = window.confirm("Delete this prisoner permanently?");
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/prisoners/${prisonerId}`);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="split-grid">
      <section className="panel">
        <h2>Prisoners</h2>
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
                <th>Name</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Location</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.prisoner_id}>
                  <td>{row.prisoner_id}</td>
                  <td>{row.full_name}</td>
                  <td>{row.risk_level}</td>
                  <td>{row.status}</td>
                  <td>{row.current_location_id ?? "-"}</td>
                  <td>{!isViewer && <button className="danger-btn" onClick={() => deletePrisoner(row.prisoner_id)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {!isViewer && (
        <section className="panel">
          <h2>New prisoner</h2>
          <form className="form-grid" onSubmit={create}>
            <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
            <label>Date of birth<input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} required /></label>
            <label>Gender<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></label>
            <label>Crime type<input value={form.crime_type} onChange={(e) => setForm({ ...form, crime_type: e.target.value })} /></label>
            <label>Risk<select value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label>Location ID<input type="number" value={form.current_location_id} onChange={(e) => setForm({ ...form, current_location_id: e.target.value })} required /></label>
            <label>Sentence start<input type="date" value={form.sentence_start} onChange={(e) => setForm({ ...form, sentence_start: e.target.value })} /></label>
            <label>Sentence end<input type="date" value={form.sentence_end} onChange={(e) => setForm({ ...form, sentence_end: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Create</button>
          </form>
        </section>
      )}

      {!isViewer && (
        <section className="panel">
          <h2>Update prisoner</h2>
          <form className="form-grid" onSubmit={update}>
            <label>Prisoner ID<input type="number" value={updateForm.prisoner_id} onChange={(e) => setUpdateForm({ ...updateForm, prisoner_id: e.target.value })} required /></label>
            <label>Full name<input value={updateForm.full_name} onChange={(e) => setUpdateForm({ ...updateForm, full_name: e.target.value })} /></label>
            <label>Risk<select value={updateForm.risk_level} onChange={(e) => setUpdateForm({ ...updateForm, risk_level: e.target.value })}><option value="">(no change)</option><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label>Status<select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}><option value="">(no change)</option><option>InPrison</option><option>Released</option></select></label>
            <label>Location ID<input type="number" value={updateForm.current_location_id} onChange={(e) => setUpdateForm({ ...updateForm, current_location_id: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Update</button>
          </form>
        </section>
      )}
    </div>
  );
}
