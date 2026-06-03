import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

const pageSize = 20;

const initialCreateForm = {
  full_name: "",
  date_of_birth: "",
  gender: "Male",
  crime_type: "",
  risk_level: "Low",
  rehab_hours: 0,
  current_location_id: "",
  sentence_start: "",
  sentence_end: "",
};

const initialFilters = {
  name: "",
  risk_level: "",
  location_id: "",
};

const editableByGuard = ["full_name", "gender", "crime_type", "risk_level", "rehab_hours"];

function formatDateOnly(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeLocationId(value) {
  if (value === "") {
    return null;
  }
  return Number(value);
}

function riskClass(riskLevel) {
  switch ((riskLevel || "").toLowerCase()) {
    case "high":
      return "risk-high";
    case "medium":
      return "risk-medium";
    case "low":
      return "risk-low";
    default:
      return "risk-neutral";
  }
}

function statusClass(status) {
  return status === "Released" ? "status-inactive" : "status-active";
}

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}

function RiskBadge({ value }) {
  return <span className={`status-badge ${riskClass(value)}`}>{value || "-"}</span>;
}

function PrisonerEditModal({ prisoner, userRole, locations, onClose, onSaved, showToast }) {
  const canEditAll = userRole === "Admin" || userRole === "Warden";
  const [form, setForm] = useState({
    full_name: prisoner?.full_name || "",
    date_of_birth: prisoner?.date_of_birth || "",
    gender: prisoner?.gender || "Male",
    crime_type: prisoner?.crime_type || "",
    risk_level: prisoner?.risk_level || "Low",
    rehab_hours: prisoner?.rehab_hours ?? 0,
    current_location_id: prisoner?.current_location_id ?? "",
    sentence_start: prisoner?.sentence_start || "",
    sentence_end: prisoner?.sentence_end || "",
    status: prisoner?.status || "InPrison",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      full_name: prisoner?.full_name || "",
      date_of_birth: prisoner?.date_of_birth || "",
      gender: prisoner?.gender || "Male",
      crime_type: prisoner?.crime_type || "",
      risk_level: prisoner?.risk_level || "Low",
      rehab_hours: prisoner?.rehab_hours ?? 0,
      current_location_id: prisoner?.current_location_id ?? "",
      sentence_start: prisoner?.sentence_start || "",
      sentence_end: prisoner?.sentence_end || "",
      status: prisoner?.status || "InPrison",
    });
    setError("");
  }, [prisoner]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        full_name: form.full_name,
        gender: form.gender || null,
        crime_type: form.crime_type || null,
        risk_level: form.risk_level || null,
        rehab_hours: Number(form.rehab_hours),
      };

      if (canEditAll) {
        payload.date_of_birth = form.date_of_birth || null;
        payload.current_location_id = normalizeLocationId(form.current_location_id);
        payload.sentence_start = form.sentence_start || null;
        payload.sentence_end = form.sentence_end || null;
        payload.status = form.status;
      } else {
        editableByGuard.forEach((field) => {
          payload[field] = field === "rehab_hours" ? Number(form[field]) : form[field] || null;
        });
      }

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      await api.put(`/prisoners/${prisoner.prisoner_id}`, payload);
      showToast("Prisoner updated", "success");
      onSaved();
      onClose();
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit prisoner: {prisoner?.full_name}</h3>
          <button className="close-btn" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </label>

          {canEditAll ? (
            <label>
              Date of birth
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </label>
          ) : null}

          <label>
            Gender
            <select value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Crime type
            <input value={form.crime_type} onChange={(e) => setForm({ ...form, crime_type: e.target.value })} />
          </label>

          <label>
            Risk level
            <select value={form.risk_level || ""} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>

          <label>
            Rehab hours
            <input
              type="number"
              min={0}
              value={form.rehab_hours}
              onChange={(e) => setForm({ ...form, rehab_hours: e.target.value })}
            />
          </label>

          {canEditAll ? (
            <label>
              Current location
              <select value={form.current_location_id} onChange={(e) => setForm({ ...form, current_location_id: e.target.value })}>
                <option value="">Unassigned</option>
                {locations.map((location) => (
                  <option key={location.location_id} value={location.location_id}>
                    {location.location_name} ({location.current_occupancy}/{location.capacity})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {canEditAll ? (
            <label>
              Sentence start
              <input type="date" value={form.sentence_start} onChange={(e) => setForm({ ...form, sentence_start: e.target.value })} />
            </label>
          ) : null}

          {canEditAll ? (
            <label>
              Sentence end
              <input type="date" value={form.sentence_end} onChange={(e) => setForm({ ...form, sentence_end: e.target.value })} />
            </label>
          ) : null}

          {canEditAll ? (
            <label>
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="InPrison">InPrison</option>
                <option value="Released">Released</option>
              </select>
            </label>
          ) : null}

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PrisonersPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "Admin" || user?.role === "Warden";
  const canEdit = user?.role === "Admin" || user?.role === "Warden";
  const canDelete = user?.role === "Admin" || user?.role === "Warden";
  const [rows, setRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterDraft, setFilterDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editingPrisoner, setEditingPrisoner] = useState(null);
  const [selectedPrisoner, setSelectedPrisoner] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const locationById = useMemo(() => {
    return new Map(locations.map((location) => [location.location_id, location]));
  }, [locations]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const loadLocations = async () => {
    setLocationLoading(true);
    try {
      const response = await api.get("/locations?page=1&page_size=100");
      setLocations(response.data);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLocationLoading(false);
    }
  };

  const loadPrisoners = async (pageNumber = page, appliedFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNumber));
      params.set("page_size", String(pageSize));
      if (appliedFilters.name) {
        params.set("name", appliedFilters.name);
      }
      if (appliedFilters.risk_level) {
        params.set("risk_level", appliedFilters.risk_level);
      }
      if (appliedFilters.location_id) {
        params.set("location_id", appliedFilters.location_id);
      }

      const response = await api.get(`/prisoners?${params.toString()}`);
      setRows(response.data);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPrisonerDetail = async (prisonerId) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/prisoners/${prisonerId}`);
      setSelectedPrisoner(response.data);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadPrisoners(page, filters);
  }, [page, filters]);

  useEffect(() => {
    if (selectedPrisoner?.prisoner_id) {
      loadPrisonerDetail(selectedPrisoner.prisoner_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters({ ...filterDraft });
  };

  const handleResetFilters = () => {
    setFilterDraft(initialFilters);
    setPage(1);
    setFilters(initialFilters);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        full_name: createForm.full_name,
        date_of_birth: createForm.date_of_birth,
        gender: createForm.gender || null,
        crime_type: createForm.crime_type || null,
        risk_level: createForm.risk_level || null,
        rehab_hours: Number(createForm.rehab_hours),
        current_location_id: normalizeLocationId(createForm.current_location_id),
        sentence_start: createForm.sentence_start || null,
        sentence_end: createForm.sentence_end || null,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") {
          delete payload[key];
        }
      });

      await api.post("/prisoners", payload);
      setCreateForm(initialCreateForm);
      showToast("Prisoner created", "success");
      setPage(1);
      await loadPrisoners(1, filters);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prisoner) => {
    const confirmed = window.confirm(`Delete prisoner "${prisoner.full_name}" permanently?`);
    if (!confirmed) {
      return;
    }

    setError("");
    try {
      await api.delete(`/prisoners/${prisoner.prisoner_id}`);
      showToast("Prisoner deleted", "success");
      if (selectedPrisoner?.prisoner_id === prisoner.prisoner_id) {
        setSelectedPrisoner(null);
      }
      await loadPrisoners(page, filters);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  const selectedLocation = selectedPrisoner?.current_location_id
    ? locationById.get(selectedPrisoner.current_location_id)
    : null;

  return (
    <div className="split-grid prisoners-page">
      <section className="panel">
        <h2>Prisoners</h2>
        <p className="hint-text">Search by name, risk level, or location. Click a row to inspect sentence, productivity, and active labor projects.</p>

        {error && <div className="error-msg">{error}</div>}

        <form className="prisoners-toolbar" onSubmit={handleSearch}>
          <label>
            Name
            <input
              value={filterDraft.name}
              onChange={(e) => setFilterDraft({ ...filterDraft, name: e.target.value })}
              placeholder="Search by prisoner name"
            />
          </label>

          <label>
            Risk level
            <select value={filterDraft.risk_level} onChange={(e) => setFilterDraft({ ...filterDraft, risk_level: e.target.value })}>
              <option value="">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>

          <label>
            Location
            <select value={filterDraft.location_id} onChange={(e) => setFilterDraft({ ...filterDraft, location_id: e.target.value })}>
              <option value="">All</option>
              {locations.map((location) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.location_name}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-btn" type="submit">
            Search
          </button>

          <button className="secondary-btn" type="button" onClick={handleResetFilters}>
            Reset
          </button>
        </form>

        <div className="inline-form pagination">
          <button className="secondary-btn" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Prev
          </button>
          <span className="muted">Page {page}</span>
          <button className="secondary-btn" disabled={loading} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading prisoners...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="loading-state">
            <p>No prisoners found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>DOB</th>
                  <th>Crime</th>
                  <th>Risk Level</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = selectedPrisoner?.prisoner_id === row.prisoner_id;
                  const location = row.current_location_id ? locationById.get(row.current_location_id) : null;

                  return (
                    <tr key={row.prisoner_id} className={isSelected ? "selected-row" : ""}>
                      <td>{row.prisoner_id}</td>
                      <td>{row.full_name}</td>
                      <td>{formatDateOnly(row.date_of_birth)}</td>
                      <td>{row.crime_type || "-"}</td>
                      <td>
                        <RiskBadge value={row.risk_level} />
                      </td>
                      <td>{location?.location_name || "Unassigned"}</td>
                      <td>
                        <span className={`status-badge ${statusClass(row.status)}`}>{row.status}</span>
                      </td>
                      <td>
                        <div className="table-actions-inline">
                          <button
                            className="btn-sm btn-edit"
                            type="button"
                            onClick={() => loadPrisonerDetail(row.prisoner_id)}
                          >
                            View
                          </button>
                          {canEdit && (
                            <button
                              className="btn-sm btn-edit"
                              type="button"
                              onClick={async () => {
                                await loadPrisonerDetail(row.prisoner_id);
                                setEditingPrisoner(row);
                              }}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn-sm btn-delete" type="button" onClick={() => handleDelete(row)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="stack-grid">
        <section className="panel prisoner-detail">
          <h2>Prisoner detail</h2>
          {detailLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading prisoner detail...</p>
            </div>
          ) : selectedPrisoner ? (
            <>
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Full name</span>
                  <strong>{selectedPrisoner.full_name}</strong>
                </div>
                <div className="detail-item">
                  <span>Sentence</span>
                  <strong>
                    {formatDateOnly(selectedPrisoner.sentence_start)} - {formatDateOnly(selectedPrisoner.sentence_end)}
                  </strong>
                </div>
                <div className="detail-item">
                  <span>Risk level</span>
                  <strong>
                    <RiskBadge value={selectedPrisoner.risk_level} />
                  </strong>
                </div>
                <div className="detail-item">
                  <span>Productivity</span>
                  <strong>{selectedPrisoner.productivity_score ?? 0}</strong>
                </div>
                <div className="detail-item">
                  <span>Current location</span>
                  <strong>{selectedPrisoner.current_location_name || selectedLocation?.location_name || "Unassigned"}</strong>
                </div>
                <div className="detail-item">
                  <span>Status</span>
                  <strong>
                    <span className={`status-badge ${statusClass(selectedPrisoner.status)}`}>{selectedPrisoner.status}</span>
                  </strong>
                </div>
              </div>

              <div>
                <h3>Active projects</h3>
                {selectedPrisoner.projects?.length ? (
                  <div className="project-list">
                    {selectedPrisoner.projects.map((project) => (
                      <span key={project} className="project-pill">
                        {project}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="hint-text">No active labor projects.</p>
                )}
              </div>
            </>
          ) : (
            <div className="loading-state">
              <p>Select a prisoner to inspect details.</p>
            </div>
          )}
        </section>

        {canCreate ? (
          <section className="panel">
            <div className="section-head">
              <h2>Create prisoner</h2>
              <button className="secondary-btn" type="button" onClick={() => setShowCreateForm((open) => !open)}>
                {showCreateForm ? "Hide" : "Show"}
              </button>
            </div>
            <p className="hint-text">Capacity is checked on submit. If a cell is full, creation will fail before saving.</p>
            {showCreateForm && (
              <form className="form-grid" onSubmit={handleCreate}>
                <label>
                  Full name
                  <input value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} required />
                </label>

                <label>
                  Date of birth
                  <input type="date" value={createForm.date_of_birth} onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })} required />
                </label>

                <label>
                  Gender
                  <select value={createForm.gender} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Crime type
                  <input value={createForm.crime_type} onChange={(e) => setCreateForm({ ...createForm, crime_type: e.target.value })} />
                </label>

                <label>
                  Risk level
                  <select value={createForm.risk_level} onChange={(e) => setCreateForm({ ...createForm, risk_level: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>

                <label>
                  Rehab hours
                  <input
                    type="number"
                    min={0}
                    value={createForm.rehab_hours}
                    onChange={(e) => setCreateForm({ ...createForm, rehab_hours: e.target.value })}
                  />
                </label>

                <label>
                  Current location
                  <select
                    value={createForm.current_location_id}
                    onChange={(e) => setCreateForm({ ...createForm, current_location_id: e.target.value })}
                    disabled={locationLoading}
                  >
                    <option value="">Unassigned</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.location_name} ({location.current_occupancy}/{location.capacity})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Sentence start
                  <input type="date" value={createForm.sentence_start} onChange={(e) => setCreateForm({ ...createForm, sentence_start: e.target.value })} />
                </label>

                <label>
                  Sentence end
                  <input type="date" value={createForm.sentence_end} onChange={(e) => setCreateForm({ ...createForm, sentence_end: e.target.value })} />
                </label>

                <button className="primary-btn" type="submit" disabled={saving || locationLoading}>
                  {saving ? "Creating..." : "Create"}
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="panel">
            <h2>Access</h2>
            <p className="hint-text">Your role can view prisoner data.</p>
          </section>
        )}
      </div>

      {editingPrisoner && canEdit ? (
        <PrisonerEditModal
          prisoner={editingPrisoner}
          userRole={user?.role}
          locations={locations}
          onClose={() => setEditingPrisoner(null)}
          onSaved={async () => {
            await loadPrisoners(page, filters);
            await loadPrisonerDetail(editingPrisoner.prisoner_id);
          }}
          showToast={showToast}
        />
      ) : null}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
