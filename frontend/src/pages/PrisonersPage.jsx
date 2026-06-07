import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";

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

function CreatePrisonerModal({ locations, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(initialCreateForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        full_name: form.full_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender || null,
        crime_type: form.crime_type || null,
        risk_level: form.risk_level || null,
        rehab_hours: Number(form.rehab_hours),
        current_location_id: normalizeLocationId(form.current_location_id),
        sentence_start: form.sentence_start || null,
        sentence_end: form.sentence_end || null,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") {
          delete payload[key];
        }
      });

      await api.post("/prisoners", payload);
      showToast("Prisoner created", "success");
      setForm(initialCreateForm);
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
          <h3>Create new prisoner</h3>
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

          <label>
            Date of birth
            <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} required />
          </label>

          <label>
            Gender
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
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
            <select value={form.risk_level} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
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

          <label>
            Current location
            <select
              value={form.current_location_id}
              onChange={(e) => setForm({ ...form, current_location_id: e.target.value })}
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
            <input type="date" value={form.sentence_start} onChange={(e) => setForm({ ...form, sentence_start: e.target.value })} />
          </label>

          <label>
            Sentence end
            <input type="date" value={form.sentence_end} onChange={(e) => setForm({ ...form, sentence_end: e.target.value })} />
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
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

// ============================================
// Prisoner Detail Modal (replaces the old right sidebar)
// ============================================
function PrisonerDetailModal({ prisoner, onClose, onEdit, onDelete, canEdit, canDelete, locationById }) {
  if (!prisoner) return null;

  const location = prisoner.current_location_id 
    ? locationById.get(prisoner.current_location_id) 
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Prisoner Detail</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        <div className="detail-grid" style={{ marginTop: 8 }}>
          <div className="detail-item">
            <span>Full name</span>
            <strong>{prisoner.full_name}</strong>
          </div>

          <div className="detail-item">
            <span>Date of birth</span>
            <strong>{formatDateOnly(prisoner.date_of_birth)}</strong>
          </div>

          <div className="detail-item">
            <span>Gender</span>
            <strong>{prisoner.gender || "-"}</strong>
          </div>

          <div className="detail-item">
            <span>Crime type</span>
            <strong>{prisoner.crime_type || "-"}</strong>
          </div>

          <div className="detail-item">
            <span>Risk level</span>
            <div><RiskBadge value={prisoner.risk_level} /></div>
          </div>

          <div className="detail-item">
            <span>Productivity score</span>
            <strong>{prisoner.productivity_score ?? 0}</strong>
          </div>

          <div className="detail-item">
            <span>Current location</span>
            <strong>
              {prisoner.current_location_name || location?.location_name || "Unassigned"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Sentence</span>
            <strong>
              {formatDateOnly(prisoner.sentence_start)} — {formatDateOnly(prisoner.sentence_end)}
            </strong>
          </div>

          <div className="detail-item">
            <span>Status</span>
            <div>
              <span className={`status-badge ${statusClass(prisoner.status)}`}>
                {prisoner.status}
              </span>
            </div>
          </div>
        </div>

        {/* Active labor projects */}
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Active labor projects</h3>
          {prisoner.projects?.length > 0 ? (
            <div className="project-list">
              {prisoner.projects.map((project, index) => (
                <span key={index} className="project-pill">{project}</span>
              ))}
            </div>
          ) : (
            <p className="hint-text">No active labor projects.</p>
          )}
        </div>

        {/* Action buttons in modal */}
        <div className="modal-buttons" style={{ marginTop: 24 }}>
          {canEdit && (
            <button
              className="primary-btn"
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              className="btn-delete"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
          <button
            className="secondary-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
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
  const [filterDraft, setFilterDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Modal states
  const [selectedPrisoner, setSelectedPrisoner] = useState(null); // for detail modal
  const [editingPrisoner, setEditingPrisoner] = useState(null);   // for edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  // Load prisoner detail for the modal
  const loadPrisonerDetail = async (prisonerId) => {
    try {
      const response = await api.get(`/prisoners/${prisonerId}`);
      setSelectedPrisoner(response.data);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadPrisoners(page, filters);
  }, [page, filters]);

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

  const handleDelete = async (prisoner) => {
    const confirmed = window.confirm(`Delete prisoner "${prisoner.full_name}" permanently?`);
    if (!confirmed) {
      return;
    }

    setError("");
    try {
      await api.delete(`/prisoners/${prisoner.prisoner_id}`);
      showToast("Prisoner deleted", "success");

      // Close detail modal if the deleted prisoner was open
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

  const createActions = canCreate
    ? [
        {
          label: "+ Create Prisoner",
          onClick: () => setShowCreateModal(true),
          variant: "create",
          title: "Open form to register a new prisoner",
        },
      ]
    : [];

  // Open detail modal for a prisoner
  const openPrisonerDetail = async (prisonerId) => {
    await loadPrisonerDetail(prisonerId);
  };

  // When clicking Edit from the detail modal
  const handleEditFromDetail = () => {
    if (selectedPrisoner) {
      setEditingPrisoner(selectedPrisoner);
      setSelectedPrisoner(null); // close detail modal
    }
  };

  // When clicking Delete from the detail modal
  const handleDeleteFromDetail = () => {
    if (selectedPrisoner) {
      handleDelete(selectedPrisoner);
      // handleDelete will close the modal if needed
    }
  };

  return (
    <>
      <div className="page-action-layout">
        <div className="page-action-column">
          <ActionSidebar title="Actions" actions={createActions} />
        </div>

        <div className="page-main-data">
          {/* Full width table (main content now takes the available space) */}
          <section className="panel">
            <h2>Prisoners</h2>
            <p className="hint-text">
              Search by name, risk level, or location. Click a row to view full details in a modal.
            </p>

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
                      const location = row.current_location_id ? locationById.get(row.current_location_id) : null;

                      return (
                        <tr 
                          key={row.prisoner_id} 
                          onClick={() => openPrisonerDetail(row.prisoner_id)}
                          style={{ cursor: "pointer" }}
                        >
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
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="table-actions-inline">
                              <button
                                className="btn-sm btn-edit"
                                type="button"
                                onClick={() => openPrisonerDetail(row.prisoner_id)}
                              >
                                View
                              </button>
                              {canEdit && (
                                <button
                                  className="btn-sm btn-edit"
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await loadPrisonerDetail(row.prisoner_id);
                                    setEditingPrisoner(row);
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button 
                                  className="btn-sm btn-delete" 
                                  type="button" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(row);
                                  }}
                                >
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
        </div>
      </div>

      {/* Prisoner Detail Modal - replaces the old right sidebar */}
      {selectedPrisoner && (
        <PrisonerDetailModal
          prisoner={selectedPrisoner}
          onClose={() => setSelectedPrisoner(null)}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteFromDetail}
          canEdit={canEdit}
          canDelete={canDelete}
          locationById={locationById}
        />
      )}

      {/* Existing Edit Modal */}
      {editingPrisoner && canEdit ? (
        <PrisonerEditModal
          prisoner={editingPrisoner}
          userRole={user?.role}
          locations={locations}
          onClose={() => setEditingPrisoner(null)}
          onSaved={async () => {
            await loadPrisoners(page, filters);
            // If detail modal was open before, refresh the data in it
            if (selectedPrisoner?.prisoner_id === editingPrisoner.prisoner_id) {
              await loadPrisonerDetail(editingPrisoner.prisoner_id);
            }
            setEditingPrisoner(null);
          }}
          showToast={showToast}
        />
      ) : null}

      {/* Create Modal */}
      {showCreateModal && canCreate ? (
        <CreatePrisonerModal
          locations={locations}
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            setPage(1);
            await loadPrisoners(1, filters);
          }}
          showToast={showToast}
        />
      ) : null}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
