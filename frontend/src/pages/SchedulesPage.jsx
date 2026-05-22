import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SchedulesPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "Viewer";
  const isGuard = user?.role === "Guard";
  const isReadOnly = isViewer || isGuard;
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(1);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [daily, setDaily] = useState(null);
  const [result, setResult] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [schedulePage, setSchedulePage] = useState(1);
  const schedulePageSize = 20;
  const [updateForm, setUpdateForm] = useState({
    schedule_id: "",
    prisoner_id: "",
    project_id: "",
    location_id: "",
    shift_id: "",
    start_time: "",
    end_time: "",
    status: "",
  });
  const [error, setError] = useState("");

  const loadConfigs = async () => {
    try {
      const response = await api.get("/schedules/configs?page=1&page_size=20");
      setConfigs(response.data);
      if (response.data.length > 0) {
        setSelectedConfig(response.data[0].config_id);
      }
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await api.get(`/schedules?page=${schedulePage}&page_size=${schedulePageSize}`);
      setSchedules(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const loadDaily = async () => {
    try {
      const response = await api.get(`/schedules/daily?target_date=${targetDate}&group_by=location`);
      setDaily(response.data);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [schedulePage]);

  const generate = async () => {
    setError("");
    try {
      const response = await api.post("/schedules/generate", {
        config_id: Number(selectedConfig),
        target_date: targetDate,
      });
      setResult(response.data);
      await loadDaily();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const updateSchedule = async (event) => {
    event.preventDefault();
    setError("");
    if (!updateForm.schedule_id) {
      setError("Schedule ID is required");
      return;
    }

    const payload = {};
    if (updateForm.prisoner_id) payload.prisoner_id = Number(updateForm.prisoner_id);
    if (updateForm.project_id) payload.project_id = Number(updateForm.project_id);
    if (updateForm.location_id) payload.location_id = Number(updateForm.location_id);
    if (updateForm.shift_id) payload.shift_id = Number(updateForm.shift_id);
    if (updateForm.start_time) payload.start_time = updateForm.start_time;
    if (updateForm.end_time) payload.end_time = updateForm.end_time;
    if (updateForm.status) payload.status = updateForm.status;

    try {
      await api.put(`/schedules/${Number(updateForm.schedule_id)}`, payload);
      setUpdateForm({
        schedule_id: "",
        prisoner_id: "",
        project_id: "",
        location_id: "",
        shift_id: "",
        start_time: "",
        end_time: "",
        status: "",
      });
      await loadSchedules();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const deleteSchedule = async (scheduleId) => {
    const confirmed = window.confirm("Delete this schedule permanently?");
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/schedules/${scheduleId}`);
      await loadSchedules();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="stack-grid">
      {!isReadOnly && (
        <section className="panel">
          <h2>Schedule Generator (Optimizer)</h2>
          {error && <p className="error-msg">{error}</p>}
          <div className="inline-form">
            <label>Config
              <select value={selectedConfig} onChange={(e) => setSelectedConfig(e.target.value)}>
                {configs.map((cfg) => (
                  <option key={cfg.config_id} value={cfg.config_id}>{cfg.config_name || `Config ${cfg.config_id}`}</option>
                ))}
              </select>
            </label>
            <label>Target date<input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></label>
            <button className="primary-btn" onClick={generate}>Generate</button>
            <button className="secondary-btn" onClick={loadDaily}>Refresh Daily</button>
          </div>
          {result && (
            <pre className="json-box">{JSON.stringify(result, null, 2)}</pre>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Daily Grouped Schedule</h2>
        {daily ? <pre className="json-box">{JSON.stringify(daily, null, 2)}</pre> : <p className="muted">No data loaded</p>}
      </section>

      <section className="panel">
        <h2>Schedules</h2>
        {error && <p className="error-msg">{error}</p>}
        <div className="inline-form">
          <button className="secondary-btn" disabled={schedulePage <= 1} onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {schedulePage}</span>
          <button className="secondary-btn" onClick={() => setSchedulePage((p) => p + 1)}>Next</button>
        </div>
        <div className="table-wrap">
          <table>
            {isReadOnly ? (
              <thead>
                <tr>
                  <th>Prisoner Name</th>
                  <th>Prisoner ID</th>
                  <th>Location ID</th>
                  <th>Shift (Ca lam)</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                </tr>
              </thead>
            ) : (
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Prisoner</th>
                  <th>Shift</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
            )}
            <tbody>
              {schedules.map((row) => (
                <tr key={row.schedule_id}>
                  {isReadOnly ? (
                    <>
                      <td>{row.prisoner_name || row.prisoner?.full_name || "-"}</td>
                      <td>{row.prisoner_id}</td>
                      <td>{row.location_id ?? "-"}</td>
                      <td>{row.shift_name || row.shift_id}</td>
                      <td>{String(row.start_time).slice(0, 16)}</td>
                      <td>{String(row.end_time).slice(0, 16)}</td>
                    </>
                  ) : (
                    <>
                      <td>{row.schedule_id}</td>
                      <td>{row.prisoner_id}</td>
                      <td>{row.shift_id}</td>
                      <td>{String(row.start_time).slice(0, 16)}</td>
                      <td>{String(row.end_time).slice(0, 16)}</td>
                      <td>{row.status}</td>
                      <td><button className="danger-btn" onClick={() => deleteSchedule(row.schedule_id)}>Delete</button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {!isReadOnly && (
        <section className="panel">
          <h2>Update schedule</h2>
          <form className="form-grid" onSubmit={updateSchedule}>
            <label>Schedule ID<input type="number" value={updateForm.schedule_id} onChange={(e) => setUpdateForm({ ...updateForm, schedule_id: e.target.value })} required /></label>
            <label>Prisoner ID<input type="number" value={updateForm.prisoner_id} onChange={(e) => setUpdateForm({ ...updateForm, prisoner_id: e.target.value })} /></label>
            <label>Project ID<input type="number" value={updateForm.project_id} onChange={(e) => setUpdateForm({ ...updateForm, project_id: e.target.value })} /></label>
            <label>Location ID<input type="number" value={updateForm.location_id} onChange={(e) => setUpdateForm({ ...updateForm, location_id: e.target.value })} /></label>
            <label>Shift ID<input type="number" value={updateForm.shift_id} onChange={(e) => setUpdateForm({ ...updateForm, shift_id: e.target.value })} /></label>
            <label>Start<input type="datetime-local" value={updateForm.start_time} onChange={(e) => setUpdateForm({ ...updateForm, start_time: e.target.value })} /></label>
            <label>End<input type="datetime-local" value={updateForm.end_time} onChange={(e) => setUpdateForm({ ...updateForm, end_time: e.target.value })} /></label>
            <label>Status<select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}><option value="">(no change)</option><option>Active</option><option>Cancelled</option><option>Completed</option></select></label>
            <button className="primary-btn" type="submit">Update</button>
          </form>
        </section>
      )}
    </div>
  );
}
