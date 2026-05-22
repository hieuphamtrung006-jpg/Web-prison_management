import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
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

export default function VisitsPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "Viewer";
  const isGuard = user?.role === "Guard";
  const isReadOnly = isViewer || isGuard;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [updateForm, setUpdateForm] = useState({
    visit_id: "",
    prisoner_id: "",
    visitor_name: "",
    visit_date: "",
    status: "",
    notes: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState("");

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
      await api.put(`/visits/requests/${visitId}/approve`);
      await load();
      await loadPendingRequests();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const requestVisit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/visits/request", {
        prisoner_id: Number(requestForm.prisoner_id),
        requested_date: requestForm.requested_date,
      });
      setRequestForm(initialRequestForm);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const updateVisit = async (event) => {
    event.preventDefault();
    setError("");
    if (!updateForm.visit_id) {
      setError("Visit ID is required");
      return;
    }

    const payload = {};
    if (updateForm.prisoner_id) payload.prisoner_id = Number(updateForm.prisoner_id);
    if (updateForm.visitor_name) payload.visitor_name = updateForm.visitor_name;
    if (updateForm.visit_date) payload.visit_date = updateForm.visit_date;
    if (updateForm.status) payload.status = updateForm.status;
    if (updateForm.notes) payload.notes = updateForm.notes;

    try {
      await api.put(`/visits/${Number(updateForm.visit_id)}`, payload);
      setUpdateForm({ visit_id: "", prisoner_id: "", visitor_name: "", visit_date: "", status: "", notes: "" });
      await load();
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

  return (
    <div className="split-grid">
      <section className="panel">
        <h2>{isReadOnly ? "Visits" : "Pending Visit Requests"}</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="inline-form">
          <button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              {isReadOnly ? (
                <tr><th>ID</th><th>Prisoner</th><th>Visitor</th><th>Status</th></tr>
              ) : (
                <tr><th>ID</th><th>Prisoner</th><th>Visitor</th><th>Status</th><th></th><th></th></tr>
              )}
            </thead>
            <tbody>
              {isReadOnly
                ? rows.map((row) => (
                    <tr key={row.visit_id}>
                      <td>{row.visit_id}</td><td>{row.prisoner_id}</td><td>{row.visitor_name}</td><td>{row.status}</td>
                    </tr>
                  ))
                : pendingRequests.map((row) => (
                    <tr key={row.request_id}>
                      <td>{row.request_id}</td><td>{row.prisoner_id}</td><td>{row.viewer_id}</td><td>{row.status}</td>
                      <td><button className="secondary-btn" onClick={() => approve(row.request_id)}>Approve</button></td>
                      <td></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
      {isViewer ? (
        <section className="panel">
          <h2>Request Visit</h2>
          <form className="form-grid" onSubmit={requestVisit}>
            <label>Prisoner ID<input type="number" value={requestForm.prisoner_id} onChange={(e) => setRequestForm({ ...requestForm, prisoner_id: e.target.value })} required /></label>
            <label>Date<input type="datetime-local" value={requestForm.requested_date} onChange={(e) => setRequestForm({ ...requestForm, requested_date: e.target.value })} required /></label>
            <button className="primary-btn" type="submit">Request</button>
          </form>
        </section>
      ) : isGuard ? null : (
        <>
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

          <section className="panel">
            <h2>Update Visit</h2>
            <form className="form-grid" onSubmit={updateVisit}>
              <label>Visit ID<input type="number" value={updateForm.visit_id} onChange={(e) => setUpdateForm({ ...updateForm, visit_id: e.target.value })} required /></label>
              <label>Prisoner ID<input type="number" value={updateForm.prisoner_id} onChange={(e) => setUpdateForm({ ...updateForm, prisoner_id: e.target.value })} /></label>
              <label>Visitor<input value={updateForm.visitor_name} onChange={(e) => setUpdateForm({ ...updateForm, visitor_name: e.target.value })} /></label>
              <label>Date<input type="datetime-local" value={updateForm.visit_date} onChange={(e) => setUpdateForm({ ...updateForm, visit_date: e.target.value })} /></label>
              <label>Status<select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}><option value="">(no change)</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
              <label>Notes<textarea value={updateForm.notes} onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })} /></label>
              <button className="primary-btn" type="submit">Update</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
