import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";

const assignInit = {
  prisoner_id: 1,
  project_id: 1,
  assignment_date: new Date().toISOString().slice(0, 10),
  hours_assigned: 4,
};

const perfInit = {
  prisoner_id: 1,
  project_id: 1,
  work_date: new Date().toISOString().slice(0, 10),
  productivity: 80,
  notes: "",
};

export default function LaborPage() {
  const [projects, setProjects] = useState([]);
  const [assignForm, setAssignForm] = useState(assignInit);
  const [perfForm, setPerfForm] = useState(perfInit);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get(`/labor/projects?page=${page}&page_size=${pageSize}`);
      setProjects(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const createAssignment = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/labor/assignments", {
        ...assignForm,
        prisoner_id: Number(assignForm.prisoner_id),
        project_id: Number(assignForm.project_id),
        hours_assigned: Number(assignForm.hours_assigned),
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const createPerformance = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/labor/performance", {
        ...perfForm,
        prisoner_id: Number(perfForm.prisoner_id),
        project_id: Number(perfForm.project_id),
        productivity: Number(perfForm.productivity),
      });
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="stack-grid">
      <section className="panel">
        <h2>Projects Missing Workers</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Current</th><th>Max</th><th>Open</th></tr></thead>
            <tbody>
              {projects.map((row) => (
                <tr key={row.project_id}><td>{row.project_name}</td><td>{row.current_workers}</td><td>{row.max_workers}</td><td>{row.open_slots}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="split-grid">
        <section className="panel">
          <h2>Create Assignment</h2>
          <form className="form-grid" onSubmit={createAssignment}>
            <label>Prisoner ID<input type="number" value={assignForm.prisoner_id} onChange={(e) => setAssignForm({ ...assignForm, prisoner_id: e.target.value })} /></label>
            <label>Project ID<input type="number" value={assignForm.project_id} onChange={(e) => setAssignForm({ ...assignForm, project_id: e.target.value })} /></label>
            <label>Date<input type="date" value={assignForm.assignment_date} onChange={(e) => setAssignForm({ ...assignForm, assignment_date: e.target.value })} /></label>
            <label>Hours<input type="number" value={assignForm.hours_assigned} onChange={(e) => setAssignForm({ ...assignForm, hours_assigned: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Assign</button>
          </form>
        </section>

        <section className="panel">
          <h2>Daily Performance</h2>
          <form className="form-grid" onSubmit={createPerformance}>
            <label>Prisoner ID<input type="number" value={perfForm.prisoner_id} onChange={(e) => setPerfForm({ ...perfForm, prisoner_id: e.target.value })} /></label>
            <label>Project ID<input type="number" value={perfForm.project_id} onChange={(e) => setPerfForm({ ...perfForm, project_id: e.target.value })} /></label>
            <label>Work Date<input type="date" value={perfForm.work_date} onChange={(e) => setPerfForm({ ...perfForm, work_date: e.target.value })} /></label>
            <label>Productivity<input type="number" value={perfForm.productivity} onChange={(e) => setPerfForm({ ...perfForm, productivity: e.target.value })} /></label>
            <label>Notes<textarea value={perfForm.notes} onChange={(e) => setPerfForm({ ...perfForm, notes: e.target.value })} /></label>
            <button className="primary-btn" type="submit">Submit</button>
          </form>
        </section>
      </div>
    </div>
  );
}
