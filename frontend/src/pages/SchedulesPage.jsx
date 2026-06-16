import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

function UpdateScheduleModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    schedule_id: "",
    prisoner_id: "",
    project_id: "",
    location_id: "",
    shift_id: "",
    start_time: "",
    end_time: "",
    status: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (!form.schedule_id) {
      setError("Schedule ID is required");
      setLoading(false);
      return;
    }
    const payload = {};
    if (form.prisoner_id) payload.prisoner_id = Number(form.prisoner_id);
    if (form.project_id) payload.project_id = Number(form.project_id);
    if (form.location_id) payload.location_id = Number(form.location_id);
    if (form.shift_id) payload.shift_id = Number(form.shift_id);
    if (form.start_time) payload.start_time = form.start_time;
    if (form.end_time) payload.end_time = form.end_time;
    if (form.status) payload.status = form.status;
    try {
      await api.put(`/schedules/${Number(form.schedule_id)}`, payload);
      showToast("Schedule updated", "success");
      setForm({ schedule_id: "", prisoner_id: "", project_id: "", location_id: "", shift_id: "", start_time: "", end_time: "", status: "" });
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
          <h3>Update Schedule</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Schedule ID<input type="number" value={form.schedule_id} onChange={(e) => setForm({ ...form, schedule_id: e.target.value })} required /></label>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} /></label>
          <label>Project ID<input type="number" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} /></label>
          <label>Location ID<input type="number" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} /></label>
          <label>Shift ID<input type="number" value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })} /></label>
          <label>Start<input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
          <label>End<input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="">(no change)</option><option>Active</option><option>Cancelled</option><option>Completed</option></select></label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Saving..." : "Update"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateScheduleModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    prisoner_id: "",
    project_id: "",
    location_id: "",
    shift_id: "",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const payload = {
      prisoner_id: Number(form.prisoner_id),
      project_id: form.project_id ? Number(form.project_id) : null,
      location_id: form.location_id ? Number(form.location_id) : null,
      shift_id: form.shift_id ? Number(form.shift_id) : null,
      start_time: form.start_time,
      end_time: form.end_time,
      status: form.status,
    };
    try {
      await api.post("/schedules", payload);
      showToast("Đã tạo lịch trình", "success");
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
          <h3>Tạo Lịch trình</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>Prisoner ID<input type="number" value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required /></label>
          <label>Project ID (optional)<input type="number" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} /></label>
          <label>Location ID<input type="number" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} /></label>
          <label>Shift ID<input type="number" value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })} /></label>
          <label>Start Time<input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></label>
          <label>End Time<input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></label>
          <label>Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Active</option>
              <option>Cancelled</option>
              <option>Completed</option>
            </select>
          </label>
          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "Viewer";
  const isGuard = user?.role === "Guard";

  // Role-based permissions
  // Guard: view all, create schedule, edit schedule. No delete.
  // Warden/Admin: full (incl. generator, delete)
  // Viewer: read-only limited view
  const canCreateSchedule = !isViewer; // Guard + higher
  const canEditSchedule = !isViewer;
  const canDeleteSchedule = !isViewer && !isGuard;
  const isReadOnly = isViewer; // only pure Viewer is read-only for table

  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(1);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [daily, setDaily] = useState(null);
  const [result, setResult] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [schedulePage, setSchedulePage] = useState(1);
  const schedulePageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // for Guard create

  // Filters (all client-side for simplicity, works on loaded page data)
  const [filterDate, setFilterDate] = useState("");
  const [filterPrisonerId, setFilterPrisonerId] = useState("");
  const [filterShiftId, setFilterShiftId] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // Active / Cancelled / Completed

  // Client-side filtered list for the nice table (Guard sees clean columns + filters)
  const filteredSchedules = schedules.filter((row) => {
    const rowDate = String(row.start_time || row.end_time || "").slice(0, 10);
    const matchesDate = !filterDate || rowDate === filterDate;
    const matchesPrisoner = !filterPrisonerId || String(row.prisoner_id) === String(filterPrisonerId);
    const matchesShift = !filterShiftId || String(row.shift_id || row.shift_name || "") === String(filterShiftId);
    const matchesStatus = !filterStatus || (row.status || "Active") === filterStatus;
    return matchesDate && matchesPrisoner && matchesShift && matchesStatus;
  });

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
      await loadSchedules();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (!canDeleteSchedule) {
      showToast("Bạn không có quyền xóa lịch trình", "error");
      return;
    }
    const confirmed = window.confirm("Delete this schedule permanently?");
    if (!confirmed) return;
    setError("");
    try {
      await api.delete(`/schedules/${scheduleId}`);
      await loadSchedules();
      await loadDaily();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const showToast = (message, type = "info") => setToast({ message, type });

  // Sidebar actions for Guard: Create Schedule (no generator, no bulk update here)
  const scheduleActions = canCreateSchedule
    ? [{ label: "+ Create Schedule", onClick: () => setShowCreateModal(true), variant: "create" }]
    : [];

  return (
    <div className="page-action-layout">
      <div className="page-action-column">
        <ActionSidebar title="Actions" actions={scheduleActions} />
      </div>

      <div className="page-main-data">
      <div className="stack-grid">
      {/* Generator only for Warden/Admin (high-level) */}
      {(!isViewer && !isGuard) && (
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

      {/* Daily Grouped Schedule - title per requirement, keep grouped view */}
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Daily Grouped Schedule</h2>
            <p>Quản lý lịch lao động, thăm gặp và sinh hoạt của tù nhân.</p>
          </div>
          <button className="secondary-btn" onClick={loadDaily}>Refresh</button>
        </div>
        {daily ? (
          <pre className="json-box">{JSON.stringify(daily, null, 2)}</pre>
        ) : (
          <div className="loading-state">
            <p className="muted">Chưa có dữ liệu lịch trình cho ngày này.</p>
            {canCreateSchedule && (
              <button className="primary-btn" onClick={() => setShowCreateModal(true)} style={{ marginTop: 8 }}>
                + Tạo lịch mới
              </button>
            )}
          </div>
        )}
      </section>

      {/* Main Schedules table - redesigned for Guard (and keep for others) */}
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Lịch trình (Schedules)</h2>
            <p className="hint-text">Danh sách lịch chi tiết theo tù nhân.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary-btn" onClick={() => { loadSchedules(); loadDaily(); }}>Refresh</button>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {/* Filters (client-side for Guard): date, prisoner, shift, status */}
        <div className="inline-form" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <label>
            Ngày
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </label>
          <label>
            Tù nhân ID
            <input
              type="text"
              placeholder="Prisoner ID"
              value={filterPrisonerId}
              onChange={(e) => setFilterPrisonerId(e.target.value)}
              style={{ width: 120 }}
            />
          </label>
          <label>
            Ca (Shift ID)
            <input
              type="text"
              placeholder="Shift ID"
              value={filterShiftId}
              onChange={(e) => setFilterShiftId(e.target.value)}
              style={{ width: 100 }}
            />
          </label>
          <label>
            Status
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option>Active</option>
              <option>Cancelled</option>
              <option>Completed</option>
            </select>
          </label>
          <button className="secondary-btn" onClick={() => {
            setFilterDate(""); setFilterPrisonerId(""); setFilterShiftId(""); setFilterStatus("");
          }}>Xóa filter</button>
        </div>

        {/* Pagination */}
        <div className="inline-form" style={{ marginBottom: 8 }}>
          <button className="secondary-btn" disabled={schedulePage <= 1} onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="muted">Page {schedulePage}</span>
          <button className="secondary-btn" onClick={() => setSchedulePage((p) => p + 1)}>Next</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prisoner Name</th>
                <th>Prisoner ID</th>
                <th>Location</th>
                <th>Shift (Ca làm)</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                {/* Actions: only Edit for Guard, full for higher */}
                { (canEditSchedule || canDeleteSchedule) && <th>Actions</th> }
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={ (canEditSchedule || canDeleteSchedule) ? 8 : 7 } style={{ textAlign: "center", padding: "28px", color: "var(--muted)" }}>
                    {schedules.length === 0 ? (
                      <>
                        <p>Chưa có lịch trình nào.</p>
                        {canCreateSchedule && (
                          <button className="primary-btn" onClick={() => setShowCreateModal(true)} style={{ marginTop: 8 }}>
                            + Tạo lịch mới
                          </button>
                        )}
                      </>
                    ) : "Không có lịch trình khớp với filter."}
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((row) => {
                  const prisonerName = row.prisoner_name || row.prisoner?.full_name || "-";
                  const locationName = row.location_name || row.location?.location_name || row.location_id || "-";
                  const shiftName = row.shift_name || row.shift_id || "-";
                  return (
                    <tr key={row.schedule_id}>
                      <td>{prisonerName}</td>
                      <td>{row.prisoner_id}</td>
                      <td>{locationName}</td>
                      <td>{shiftName}</td>
                      <td>{String(row.start_time || "").slice(0, 16)}</td>
                      <td>{String(row.end_time || "").slice(0, 16)}</td>
                      <td>
                        <span className={`status-badge ${row.status === "Active" ? "status-active" : row.status === "Completed" ? "status-active" : "status-inactive"}`}>
                          {row.status || "Active"}
                        </span>
                      </td>
                      {(canEditSchedule || canDeleteSchedule) && (
                        <td>
                          <div className="table-actions">
                            {canEditSchedule && (
                              <button
                                className="btn-sm btn-edit"
                                onClick={() => {
                                  // For Guard: open the update modal.
                                  // (The modal currently requires entering Schedule ID; in real use prefill logic can be enhanced in UpdateScheduleModal)
                                  setShowUpdateModal(true);
                                }}
                              >
                                Edit
                              </button>
                            )}
                            {canDeleteSchedule && (
                              <button
                                className="btn-sm btn-delete"
                                onClick={() => deleteSchedule(row.schedule_id)}
                              >
                                Delete
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
      </section>

      {/* Create Modal for Guard + higher */}
      {showCreateModal && canCreateSchedule && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            await loadSchedules();
            await loadDaily();
          }}
          showToast={showToast}
        />
      )}

      {/* Update/Edit Modal */}
      {showUpdateModal && canEditSchedule && (
        <UpdateScheduleModal
          onClose={() => setShowUpdateModal(false)}
          onSaved={async () => {
            await loadSchedules();
            await loadDaily();
          }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
      </div>
    </div>
  );
}
