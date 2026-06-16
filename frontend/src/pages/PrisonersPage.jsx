import { useEffect, useMemo, useState, useRef } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";
import { Lock } from "lucide-react";

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
  prisoner_id: "",  // Added for Viewer convenience (search by exact ID)
};

// Fields Guard is allowed to edit (operational only). Other fields must remain read-only or hidden in the Edit modal.
// Danh sách field Guard được phép sửa (chỉ Current Location + Status theo yêu cầu mới nhất)
const guardEditableFields = ["current_location_id", "status"];

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
  const canEditAll = userRole === "Admin" || userRole === "Warden"; // Full edit for Warden/Admin: all fields (name, crime, sentence, risk, etc.)
  const isGuardRole = userRole === "Guard"; // Guard: only Current Location + Status editable; others read-only or hidden


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
      let payload = {};

      if (canEditAll) {
        // Admin / Warden: full access
        payload = {
          full_name: form.full_name,
          gender: form.gender || null,
          crime_type: form.crime_type || null,
          risk_level: form.risk_level || null,
          rehab_hours: Number(form.rehab_hours),
          date_of_birth: form.date_of_birth || null,
          current_location_id: normalizeLocationId(form.current_location_id),
          sentence_start: form.sentence_start || null,
          sentence_end: form.sentence_end || null,
          status: form.status,
        };
      } else if (isGuardRole) {
        // Guard: CHỈ được sửa Current Location và Status (theo yêu cầu).
        // Không gửi các trường khác.
        payload = {
          current_location_id: normalizeLocationId(form.current_location_id),
          status: form.status,
        };
      }

      // Clean undefined / empty
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

  // Helper to render a disabled (read-only) input for fields Guard is not allowed to change
  const readOnlyInput = (value) => (
    <input
      value={value || ""}
      disabled
      style={{ background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
    />
  );

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

        {/* Role note for Guard */}
        {isGuardRole && (
          <div className="readonly-note" style={{ margin: "0 20px 12px" }}>
            Guard role: Bạn chỉ được sửa <strong>Current Location</strong> và <strong>Status</strong>. Các trường khác chỉ xem (read-only).
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          {/* Full name - read-only for Guard */}
          <label>
            Full name
            {canEditAll ? (
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            ) : (
              readOnlyInput(form.full_name)
            )}
          </label>

          {/* DOB - only for full editors (or read-only if we want to show for Guard) */}
          {canEditAll ? (
            <label>
              Date of birth
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </label>
          ) : null}

          {/* Gender - read-only for Guard */}
          <label>
            Gender
            {canEditAll ? (
              <select value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              readOnlyInput(form.gender)
            )}
          </label>

          {/* Crime type - read-only for Guard */}
          <label>
            Crime type
            {canEditAll ? (
              <input value={form.crime_type} onChange={(e) => setForm({ ...form, crime_type: e.target.value })} />
            ) : (
              readOnlyInput(form.crime_type)
            )}
          </label>

          {/* Risk level - read-only cho Guard (chỉ Admin/Warden được sửa) */}
          <label>
            Risk level
            {canEditAll ? (
              <select value={form.risk_level || ""} onChange={(e) => setForm({ ...form, risk_level: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            ) : (
              readOnlyInput(form.risk_level)
            )}
          </label>

          {/* Rehab hours - read-only for Guard */}
          <label>
            Rehab hours
            {canEditAll ? (
              <input
                type="number"
                min={0}
                value={form.rehab_hours}
                onChange={(e) => setForm({ ...form, rehab_hours: e.target.value })}
              />
            ) : (
              readOnlyInput(form.rehab_hours)
            )}
          </label>

          {/* Current location - EDITABLE cho Guard (chỉ field này + Status) */}
          <label>
            Current location
            <select value={form.current_location_id} onChange={(e) => setForm({ ...form, current_location_id: e.target.value })}>
              <option value="">Unassigned</option>
              {locations.map((location) => (
                <option key={location.location_id} value={location.location_id}>
                  {`${location.location_name} (${location.current_occupancy}/${location.capacity})`}
                </option>
              ))}
            </select>
          </label>

          {/* Sentence dates - only full editors (hidden for Guard) */}
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

          {/* Status - EDITABLE cho Guard (chỉ field này + Current Location) */}
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="InPrison">InPrison</option>
              <option value="Released">Released</option>
            </select>
          </label>

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
                  {`${location.location_name} (${location.current_occupancy}/${location.capacity})`}
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
function PrisonerDetailModal({ prisoner, onClose, onEdit, onDelete, canEdit, canDelete, locationById, isViewer = false }) {
  if (!prisoner) return null;

  const location = prisoner.current_location_id 
    ? locationById.get(prisoner.current_location_id) 
    : null;

  // Reusable component for restricted fields (Viewer only)
  // Shows a clear message + lock icon instead of just "-"
  const RestrictedField = ({ children }) => {
    if (!isViewer) {
      return children;
    }
    return (
      <span 
        className="text-[#64748b] italic flex items-center gap-1 text-sm"
        title="Thông tin này bị hạn chế đối với vai trò Viewer"
      >
        <Lock size={12} />
        Thông tin bị hạn chế
      </span>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Prisoner: {prisoner.full_name}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        <div className="px-5 pb-2">
          {/* Prisoner details - dark theme friendly cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Full name</span>
              <strong className="text-[#e2e8f0]">{prisoner.full_name}</strong>
            </div>

            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Date of birth</span>
              <strong className="text-[#e2e8f0]">{formatDateOnly(prisoner.date_of_birth)}</strong>
            </div>

            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Gender</span>
              <strong className="text-[#e2e8f0]">{prisoner.gender || "-"}</strong>
            </div>

            {/* Crime type - restricted for Viewer */}
            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Crime type</span>
              <RestrictedField>
                <strong className="text-[#e2e8f0]">{prisoner.crime_type || "-"}</strong>
              </RestrictedField>
            </div>

            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Risk level</span>
              <div><RiskBadge value={prisoner.risk_level} /></div>
            </div>

            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Productivity score</span>
              <strong className="text-[#e2e8f0]">{prisoner.productivity_score ?? 0}</strong>
            </div>

            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Current location</span>
              <strong className="text-[#e2e8f0]">
                {prisoner.current_location_name || location?.location_name || "Unassigned"}
              </strong>
            </div>

            {/* Sentence - restricted for Viewer (dates are sensitive) */}
            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Sentence</span>
              <RestrictedField>
                <strong className="text-[#e2e8f0]">
                  {formatDateOnly(prisoner.sentence_start)} — {formatDateOnly(prisoner.sentence_end)}
                </strong>
              </RestrictedField>
            </div>

            <div className="detail-item">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase">Status</span>
              <div>
                <span className={`status-badge ${statusClass(prisoner.status)}`}>
                  {prisoner.status}
                </span>
              </div>
            </div>
          </div>

          {/* Active labor projects - dark theme friendly */}
          <div className="mt-5 pt-4 border-t border-[#1e293b]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#64748b] text-xs tracking-[0.5px] uppercase font-medium">Active labor projects</span>
            </div>

            {prisoner.projects?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prisoner.projects.map((project, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0f172a] border border-[#1e293b] text-[#e2e8f0]"
                  >
                    {project}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#64748b] text-sm">No active labor projects.</p>
            )}
          </div>
        </div>

        {/* Action buttons in modal */}
        <div className="modal-buttons px-5 pb-5" style={{ marginTop: 8 }}>
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
  const isViewer = user?.role === "Viewer";
  const isGuard = user?.role === "Guard";
  const isWarden = user?.role === "Warden";

  // Ref for debounce timer on search fields (ID + Name) to provide smooth realtime feel without spamming API on every keystroke
  const searchDebounceRef = useRef(null);

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Role-based permissions (dựa trên current_user.role)
  // Warden and Admin: FULL permissions - Create, Edit (all fields in modal), Delete
  // Guard: limited to Edit (only Current Location + Status read-only others), no Create/Delete
  // Viewer: read-only view only, no sidebar actions, no DOB/Crime columns
  const canCreate = isWarden || user?.role === "Admin";
  const canEdit = canCreate || isGuard;
  const canDelete = canCreate;

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

      // Improved combined search logic (supports ID + name together as requested):
      // - prisoner_id: sent as exact match (numeric only)
      // - name: sent as partial match (case-insensitive on backend via ILIKE)
      // - If name field contains only digits AND no prisoner_id, fallback to treat as ID (backward compat for old UX)
      // - Both can be active at same time for combined filtering (backend ANDs the conditions)
      // This works for all roles (Admin/Warden full, Guard, Viewer uses view + same params)
      if (appliedFilters.prisoner_id) {
        params.set("prisoner_id", appliedFilters.prisoner_id);
      }
      if (appliedFilters.name) {
        const nameVal = appliedFilters.name.trim();
        if (nameVal) {
          if (!appliedFilters.prisoner_id && /^\d+$/.test(nameVal)) {
            // Legacy support: numeric entered only in name box → treat as prisoner_id
            params.set("prisoner_id", nameVal);
          } else {
            params.set("name", nameVal);
          }
        }
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
    // Clear any pending debounce timer when user explicitly clicks Search
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    const newFilters = { ...filterDraft };
    setPage(1);
    setFilters(newFilters);
    setError(""); // clear previous errors on new search
    // Force load immediately (explicit button still supported for UX + combined filters)
    loadPrisoners(1, newFilters);
  };

  const handleResetFilters = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setFilterDraft(initialFilters);
    setPage(1);
    setFilters(initialFilters);
  };

  // Apply current draft filters (used by both immediate selects and debounced search fields)
  // This ensures pagination reset + explicit load for responsiveness (consistent with old handleSearch)
  const applyFilters = (draftToApply) => {
    const newFilters = { ...draftToApply };
    setPage(1);
    setFilters(newFilters);
    setError(""); // clear errors on new filter application
    loadPrisoners(1, newFilters);
  };

  // Schedule debounced apply for ID + Name fields only (350ms for smooth realtime typing without excessive API calls)
  const scheduleSearchApply = (updatedDraft) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      applyFilters(updatedDraft);
    }, 350);
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

  // Layout control based on canCreate (Warden/Admin have full sidebar with Create button and full columns)
  // Guard/Viewer: no sidebar (wider table), no DOB/Crime columns, tighter padding
  const hasCreateAction = canCreate;

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
        {/* Ẩn cột Actions bên trái cho Guard (và Viewer) vì không có nút Create.
           Giúp nới rộng bảng, đặc biệt các cột Name, Location, Status. */}
        {hasCreateAction && (
          <div className="page-action-column">
            <ActionSidebar title="Actions" actions={createActions} />
          </div>
        )}

        <div className="page-main-data" style={!hasCreateAction ? { marginLeft: 0 } : {}}>
          {/* Guard/Viewer (no Create): full width + tighter spacing để bảng rộng rãi hơn */}
          <section className="panel" style={!hasCreateAction ? { paddingTop: '8px', paddingBottom: '8px' } : {}}>
            <h2>Prisoners</h2>
            <p className="hint-text" style={!hasCreateAction ? { marginBottom: '6px', fontSize: '0.85rem' } : {}}>
              {isViewer 
                ? "Smart search: Use 'Prisoner ID' (numbers only, exact) or 'Name' (partial, case-insensitive). Debounced realtime. Supports combined + other filters." 
                : isGuard
                  ? "Guard view: Chỉ được sửa Current Location và Status. ID/Name search is debounced & combined. Click row hoặc nút Edit để chỉnh sửa."
                  : "Smart search: Prisoner ID (exact) + Name (partial). Debounce on text, instant on dropdowns. Combined filters supported. Click row for details."}
            </p>

            {error && <div className="error-msg">{error}</div>}

            <form 
              className="prisoners-toolbar" 
              onSubmit={handleSearch}
              style={!hasCreateAction ? { marginBottom: '4px' } : {}}
            >
              {/* 
                Two dedicated search fields for smart ID + name support (as per requirements):
                - Prisoner ID: numeric only (sanitized), sent as exact prisoner_id param
                - Name: free text partial match (case-insensitive via backend ILIKE)
                Combined filters (ID + name together) are fully supported and sent to API.
                Risk/Location are discrete filters kept for compatibility.
                Search on ID/Name: debounced realtime (350ms) for responsive typing.
                Risk/Location + explicit Search button: apply immediately.
                Pagination + all roles supported (params passed through; backend enforces role views).
              */}
              <label>
                Prisoner ID
                <input
                  type="text"
                  inputMode="numeric"
                  value={filterDraft.prisoner_id}
                  onChange={(e) => {
                    // Enforce numeric only for ID field (important for Guard/Admin with document IDs)
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    const updatedDraft = { ...filterDraft, prisoner_id: val };
                    setFilterDraft(updatedDraft);
                    // Debounce for smooth realtime search experience
                    scheduleSearchApply(updatedDraft);
                  }}
                  placeholder="Search by Prisoner ID"
                />
              </label>

              <label>
                Name
                <input
                  value={filterDraft.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedDraft = { ...filterDraft, name: val };
                    setFilterDraft(updatedDraft);
                    // Debounce for smooth realtime search experience
                    scheduleSearchApply(updatedDraft);
                  }}
                  placeholder="Search by prisoner name"
                />
              </label>

              <label>
                Risk level
                <select 
                  value={filterDraft.risk_level} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedDraft = { ...filterDraft, risk_level: val };
                    setFilterDraft(updatedDraft);
                    // Discrete filter: apply immediately (no debounce)
                    applyFilters(updatedDraft);
                  }}
                >
                  <option value="">All</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>

              <label>
                Location
                <select 
                  value={filterDraft.location_id} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const updatedDraft = { ...filterDraft, location_id: val };
                    setFilterDraft(updatedDraft);
                    // Discrete filter: apply immediately (no debounce)
                    applyFilters(updatedDraft);
                  }}
                >
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

            <div className="inline-form pagination" style={!hasCreateAction ? { marginTop: '2px', marginBottom: '4px' } : {}}>
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
                      {/* DOB and Crime columns shown only when canCreate (Warden/Admin have full layout with Create sidebar) */}
                      {canCreate && <th>DOB</th>}
                      {canCreate && <th>Crime</th>}
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
                          {/* Ẩn DOB và Crime cho Guard để nới rộng các cột quan trọng (Name, Location, Status) */}
                          {canCreate && <td>{formatDateOnly(row.date_of_birth)}</td>}
                          {canCreate && <td>{row.crime_type || "-"}</td>}
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
                                    // IMPORTANT for role-based: direct Edit from table row for Guard.
                                    // Explicitly close any open detail/view modal first (setSelectedPrisoner null).
                                    // Do NOT call loadPrisonerDetail (avoids triggering View modal).
                                    // This ensures ONLY the Edit modal opens - no stacking.
                                    // onView (row click / View button) is separate from onEdit (this handler).
                                    setSelectedPrisoner(null);
                                    try {
                                      const res = await api.get(`/prisoners/${row.prisoner_id}`);
                                      setEditingPrisoner(res.data);
                                    } catch (err) {
                                      setEditingPrisoner(row);
                                    }
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
          isViewer={isViewer}
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
