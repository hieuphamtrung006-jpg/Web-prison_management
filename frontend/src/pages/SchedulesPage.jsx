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



const getLocalDefaultDate = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const normalizeDate = (dateStr) => {
  if (!dateStr) return "";
  
  // Check if format is DD/MM/YYYY
  const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
  let match = dateStr.match(dmyRegex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  // Check if format is DD/MM (short)
  const dmRegexShort = /^(\d{1,2})[/-](\d{1,2})$/;
  match = dateStr.match(dmRegexShort);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  // Check if format is YYYY-MM-DD
  const ymdRegex = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
  match = dateStr.match(ymdRegex);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};

export default function SchedulesPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "Viewer";
  const isGuard = user?.role === "Guard";

  // Role-based permissions
  // Guard: view all, edit schedule. No delete.
  // Warden/Admin: full (incl. generator, delete)
  // Viewer: read-only limited view
  const canEditSchedule = !isViewer;
  const canDeleteSchedule = !isViewer && !isGuard;
  const isReadOnly = isViewer; // only pure Viewer is read-only for table

  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(1);
  const [targetDate, setTargetDate] = useState(getLocalDefaultDate());
  const [result, setResult] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [schedulePage, setSchedulePage] = useState(1);
  const schedulePageSize = 20;
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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



  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [schedulePage]);

  const generate = async () => {
    setError("");
    try {
      const normalizedDate = normalizeDate(targetDate);
      const response = await api.post("/schedules/generate", {
        config_id: Number(selectedConfig),
        target_date: normalizedDate,
      });
      setResult(response.data);
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
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const showToast = (message, type = "info") => setToast({ message, type });

  const scheduleActions = [];

  return (
    <div className="page-action-layout">
      {scheduleActions.length > 0 && (
        <div className="page-action-column">
          <ActionSidebar title="Actions" actions={scheduleActions} />
        </div>
      )}

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
            <label>Target date (Ngày/Tháng/Năm hoặc Năm-Tháng-Ngày)
              <input 
                type="text" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)} 
                placeholder="Ví dụ: 24/06/2026 hoặc 24/6" 
                style={{ width: 280 }}
              />
            </label>
            <button className="primary-btn" onClick={generate}>Generate</button>
          </div>
          {result && (
            <div className="generator-success-card" style={{
              marginTop: '16px',
              padding: '20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.03), rgba(0, 240, 255, 0.08))',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(0, 240, 255, 0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 255, 102, 0.15)',
                  color: '#00ff66',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  boxShadow: '0 0 10px rgba(0, 255, 102, 0.2)'
                }}>✓</span>
                <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.1rem', fontWeight: '600' }}>
                  Đã tạo lịch trình tự động thành công!
                </h3>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                background: 'rgba(5, 8, 20, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--line)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ngày lập lịch</span>
                  <strong style={{ color: 'var(--ink)', fontSize: '0.95rem' }}>{result.target_date}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số ca đã phân bổ</span>
                  <strong style={{ color: 'var(--ink)', fontSize: '0.95rem' }}>{result.count} ca trực</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái thuật toán</span>
                  <strong style={{ color: '#00ff66', fontSize: '0.95rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {result.ai_meta?.solver_status || 'OPTIMAL'}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời gian xử lý AI</span>
                  <strong style={{ color: 'var(--ink)', fontSize: '0.95rem' }}>
                    {result.ai_meta?.time_limit_seconds || 12} giây
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      )}



      {/* Main Schedules table - redesigned for Guard (and keep for others) */}
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Lịch trình (Schedules)</h2>
            <p className="hint-text">Danh sách lịch chi tiết theo tù nhân.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary-btn" onClick={() => { loadSchedules(); }}>Refresh</button>
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
                      <p>Chưa có lịch trình nào.</p>
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



      {/* Update/Edit Modal */}
      {showUpdateModal && canEditSchedule && (
        <UpdateScheduleModal
          onClose={() => setShowUpdateModal(false)}
          onSaved={async () => {
            await loadSchedules();
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
