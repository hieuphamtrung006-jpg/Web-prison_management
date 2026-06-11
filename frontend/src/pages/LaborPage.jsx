import { useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ActionSidebar from "../components/ActionSidebar";

const today = new Date().toISOString().slice(0, 10);
const pageSize = 10;

const initialProjectForm = {
  project_name: "",
  location_id: "",
  revenue_per_hour: 0,
  priority_score: 0,
  max_workers: 1,
  required_skills: "",
  is_active: true,
};

const initialAssignmentForm = {
  prisoner_id: "",
  project_id: "",
  assignment_date: today,
  hours_assigned: 4,
};

const initialPerformanceForm = {
  prisoner_id: "",
  project_id: "",
  work_date: today,
  productivity: 80,
  notes: "",
};

const initialAssignmentFilters = {
  prisoner_id: "",
  project_id: "",
};

const initialPerformanceFilters = {
  prisoner_id: "",
  project_id: "",
};

const projectSortOptions = [
  { value: "project_name:asc", label: "Project name A-Z" },
  { value: "project_name:desc", label: "Project name Z-A" },
  { value: "current_workers:desc", label: "Most workers" },
  { value: "open_slots:asc", label: "Fewest open slots" },
  { value: "revenue_per_hour:desc", label: "Highest revenue" },
];

const assignmentSortOptions = [
  { value: "assignment_date:desc", label: "Newest assignments" },
  { value: "assignment_date:asc", label: "Oldest assignments" },
  { value: "prisoner_name:asc", label: "Prisoner A-Z" },
  { value: "project_name:asc", label: "Project A-Z" },
];

const performanceSortOptions = [
  { value: "work_date:desc", label: "Newest scores" },
  { value: "work_date:asc", label: "Oldest scores" },
  { value: "productivity:desc", label: "Highest productivity" },
  { value: "prisoner_name:asc", label: "Prisoner A-Z" },
];

function formatDateOnly(value) {
  if (!value) return "-";
  const dateValue = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dateValue);
}

function formatMoney(value) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00";
}

function formatDecimal(value) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00";
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

function sortByField(rows, sortValue) {
  const [field, direction] = sortValue.split(":");
  const factor = direction === "desc" ? -1 : 1;

  return [...rows].sort((left, right) => {
    const leftValue = left?.[field];
    const rightValue = right?.[field];

    if (typeof leftValue === "number" || typeof rightValue === "number") {
      return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * factor;
    }

    if (field.includes("date")) {
      return (new Date(leftValue || 0).getTime() - new Date(rightValue || 0).getTime()) * factor;
    }

    return String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * factor;
  });
}

function includesText(value, query) {
  return String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}

function ProjectEditModal({ project, locations, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    project_name: project?.project_name || "",
    location_id: project?.location_id ?? "",
    revenue_per_hour: project?.revenue_per_hour ?? 0,
    priority_score: project?.priority_score ?? 0,
    max_workers: project?.max_workers ?? 1,
    required_skills: project?.required_skills || "",
    is_active: project?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      project_name: project?.project_name || "",
      location_id: project?.location_id ?? "",
      revenue_per_hour: project?.revenue_per_hour ?? 0,
      priority_score: project?.priority_score ?? 0,
      max_workers: project?.max_workers ?? 1,
      required_skills: project?.required_skills || "",
      is_active: project?.is_active ?? true,
    });
    setError("");
  }, [project]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.put(`/labor/projects/${project.project_id}`, {
        project_name: form.project_name,
        location_id: normalizeNumber(form.location_id),
        revenue_per_hour: Number(form.revenue_per_hour),
        priority_score: Number(form.priority_score),
        max_workers: Number(form.max_workers),
        required_skills: form.required_skills || null,
        is_active: form.is_active,
      });
      showToast("Project updated", "success");
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
          <h3>Edit project: {project?.project_name}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Project name
            <input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} required />
          </label>

          <label>
            Location
            <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
              <option value="">Unassigned</option>
              {locations.map((location) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.location_name} ({location.capacity})
                </option>
              ))}
            </select>
          </label>

          <label>
            Revenue / hour
            <input type="number" step="0.01" min="0" value={form.revenue_per_hour} onChange={(e) => setForm({ ...form, revenue_per_hour: e.target.value })} required />
          </label>

          <label>
            Priority score
            <input type="number" min="0" value={form.priority_score} onChange={(e) => setForm({ ...form, priority_score: e.target.value })} />
          </label>

          <label>
            Max workers
            <input type="number" min="1" value={form.max_workers} onChange={(e) => setForm({ ...form, max_workers: e.target.value })} required />
          </label>

          <label>
            Required skills
            <textarea value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} />
          </label>

          <label>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentEditModal({ assignment, projects, prisoners, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    prisoner_id: assignment?.prisoner_id ?? "",
    project_id: assignment?.project_id ?? "",
    assignment_date: assignment?.assignment_date || today,
    hours_assigned: assignment?.hours_assigned ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      prisoner_id: assignment?.prisoner_id ?? "",
      project_id: assignment?.project_id ?? "",
      assignment_date: assignment?.assignment_date || today,
      hours_assigned: assignment?.hours_assigned ?? 1,
    });
    setError("");
  }, [assignment]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.put(`/labor/assignments/${assignment.assignment_id}`, {
        prisoner_id: Number(form.prisoner_id),
        project_id: Number(form.project_id),
        assignment_date: form.assignment_date,
        hours_assigned: Number(form.hours_assigned),
      });
      showToast("Assignment updated", "success");
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
          <h3>Edit assignment: {assignment?.prisoner_name || `#${assignment?.prisoner_id}`}</h3>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Prisoner
            <select value={form.prisoner_id} onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} required>
              <option value="">Select prisoner</option>
              {prisoners.map((prisoner) => (
                <option key={prisoner.prisoner_id} value={prisoner.prisoner_id}>
                  {prisoner.full_name} (#{prisoner.prisoner_id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Project
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required>
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Assignment Date
            <input type="date" value={form.assignment_date} onChange={(e) => setForm({ ...form, assignment_date: e.target.value })} required />
          </label>

          <label>
            Hours Assigned
            <input type="number" step="0.25" min="0.25" value={form.hours_assigned} onChange={(e) => setForm({ ...form, hours_assigned: e.target.value })} required />
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionLoading({ label }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export default function LaborPage() {
  const { user } = useAuth();
  // current_user.role from AuthContext (JWT). Used for ALL UI branching and some fetch decisions.
  const isViewer = user?.role === "Viewer";
  // Viewer can view Labor data but cannot manage (create/edit/delete). Matches backend require_roles + view paths.
  const canManageProjects = user?.role === "Admin" || user?.role === "Warden";
  const canManageLabor = canManageProjects || user?.role === "Guard";
  const canCreateAssignment = canManageProjects;
  // Viewer: can view Projects + Assignments (from vw_Labor*Basic via backend), but never Performance related (no log, no history, skipped in refreshAll)
  // This + hiding action column + tighter margins + no filter-bar => clean, balanced, professional layout without Network Error or empty regions.

  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [prisoners, setPrisoners] = useState([]);
  const [prisonerSearch, setPrisonerSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [performanceSearch, setPerformanceSearch] = useState("");
  const [projectSort, setProjectSort] = useState("project_name:asc");
  const [assignmentSort, setAssignmentSort] = useState("assignment_date:desc");
  const [performanceSort, setPerformanceSort] = useState("work_date:desc");
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [performanceForm, setPerformanceForm] = useState(initialPerformanceForm);
  const [assignmentFilters, setAssignmentFilters] = useState(initialAssignmentFilters);
  const [performanceFilters, setPerformanceFilters] = useState(initialPerformanceFilters);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [performancePage, setPerformancePage] = useState(1);
  const [assignmentHasNext, setAssignmentHasNext] = useState(false);
  const [performanceHasNext, setPerformanceHasNext] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingPrisoners, setLoadingPrisoners] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingPerformance, setSavingPerformance] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showLogPerformance, setShowLogPerformance] = useState(false);

  const showToast = (message, type = "info") => setToast({ message, type });

  const filteredPrisoners = useMemo(() => {
    const search = prisonerSearch.trim().toLowerCase();
    if (!search) return prisoners;
    return prisoners.filter((prisoner) => includesText(prisoner.full_name, search) || includesText(prisoner.prisoner_id, search));
  }, [prisoners, prisonerSearch]);

  const selectedPrisonerName = useMemo(() => {
    const found = prisoners.find((prisoner) => String(prisoner.prisoner_id) === String(assignmentForm.prisoner_id));
    return found?.full_name || "";
  }, [assignmentForm.prisoner_id, prisoners]);

  const selectedPerformancePrisonerName = useMemo(() => {
    const found = prisoners.find((prisoner) => String(prisoner.prisoner_id) === String(performanceForm.prisoner_id));
    return found?.full_name || "";
  }, [performanceForm.prisoner_id, prisoners]);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.project_id, project])), [projects]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      // Viewer: backend list_projects uses get_table_name_for_role("LaborProjects") -> vw_LaborProjects_Basic + execute_viewer_query
      // Non-viewer: full query with live current_workers. Same URL, role-driven in backend.
      const response = await api.get("/labor/projects?page=1&page_size=100");
      setProjects(response.data);
      // Do not setError here (load errors should not leave persistent "Network Error" banner in UI)
    } catch (err) {
      const message = parseApiError(err);
      // setError removed to prevent "Network Error" showing in Projects section after successful partial loads (e.g. assignments failing previously polluted it)
      showToast(message, "error");
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await api.get("/locations?page=1&page_size=100");
      setLocations(response.data);
    } catch (err) {
      const message = parseApiError(err);
      // setError removed for load (prevents stale "Network Error" banner polluting Labor Projects UI)
      showToast(message, "error");
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadPrisoners = async (search = prisonerSearch) => {
    setLoadingPrisoners(true);
    try {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      if (search.trim()) {
        params.set("name", search.trim());
      }
      const response = await api.get(`/prisoners?${params.toString()}`);
      setPrisoners(response.data);
    } catch (err) {
      const message = parseApiError(err);
      // setError removed for load (prevents stale "Network Error" banner polluting Labor Projects UI)
      showToast(message, "error");
    } finally {
      setLoadingPrisoners(false);
    }
  };

  const loadAssignments = async (pageNumber = assignmentPage, filters = assignmentFilters) => {
    setLoadingAssignments(true);
    try {
      const params = new URLSearchParams({ page: String(pageNumber), page_size: String(pageSize) });
      // Viewer role handling (current_user.role === "Viewer"):
      // - Skip sending filter params (prisoner_id/project_id) so backend list_assignments does not build conditions.
      // - Backend will hit get_table_name_for_role("LaborAssignments") === "vw_LaborAssignments_Basic", use execute_viewer_query.
      // - This avoids the previous double-WHERE bug in where_clause="WHERE ..." + execute adding another WHERE.
      // - Response uses LaborAssignmentReadBasic (names missing -> UI falls back to #ID), response_model union prevents 500.
      // Client-side search (assignmentSearch) + sort still works via sortedAssignments useMemo.
      if (!isViewer) {
        if (filters.prisoner_id) params.set("prisoner_id", filters.prisoner_id);
        if (filters.project_id) params.set("project_id", filters.project_id);
      }

      const response = await api.get(`/labor/assignments?${params.toString()}`);
      setAssignments(response.data);
      setAssignmentHasNext(response.data.length === pageSize);
    } catch (err) {
      const message = parseApiError(err);
      // setError removed: previously any assignment load failure would set shared error and show "Network Error" inside Labor Projects panel
      // even when projects themselves loaded fine. Toast is sufficient for transient load issues.
      showToast(message, "error");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadPerformance = async (pageNumber = performancePage, filters = performanceFilters) => {
    setLoadingPerformance(true);
    try {
      const params = new URLSearchParams({ page: String(pageNumber), page_size: String(pageSize) });
      if (filters.prisoner_id) params.set("prisoner_id", filters.prisoner_id);
      if (filters.project_id) params.set("project_id", filters.project_id);

      const response = await api.get(`/labor/performance?${params.toString()}`);
      setPerformanceRows(response.data);
      setPerformanceHasNext(response.data.length === pageSize);
    } catch (err) {
      const message = parseApiError(err);
      // setError removed (consistent; only non-viewer uses this path)
      showToast(message, "error");
    } finally {
      setLoadingPerformance(false);
    }
  };

  const refreshAll = async () => {
    setError(""); // clear any stale error banner (e.g. from previous failed loads) so Viewer never sees lingering "Network Error"
    // Viewer role: never load performance (section + Log button + History fully hidden via !isViewer).
    // Also skip loadLocations() for Viewer: its query joins Prisoners (which is denied for db_role_viewer in grants).
    // This prevents unnecessary "Network Error" / permission toasts on Labor page for Viewer.
    // loadProjects and loadAssignments use the safe vw_*_Basic paths (with fallback for projects if view not created yet).
    const loads = [
      loadProjects(),
      ...(isViewer ? [] : [loadLocations()]),
      loadPrisoners(prisonerSearch),
      loadAssignments(assignmentPage, assignmentFilters),
    ];
    if (!isViewer) {
      loads.push(loadPerformance(performancePage, performanceFilters));
    }
    await Promise.all(loads);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPrisoners(prisonerSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prisonerSearch]);

  const reloadAssignments = async (nextPage = assignmentPage) => {
    await loadAssignments(nextPage, assignmentFilters);
  };

  const reloadPerformance = async (nextPage = performancePage) => {
    await loadPerformance(nextPage, performanceFilters);
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!canManageProjects) return;

    setSavingProject(true);
    setError("");
    try {
      await api.post("/labor/projects", {
        project_name: projectForm.project_name,
        location_id: normalizeNumber(projectForm.location_id),
        revenue_per_hour: Number(projectForm.revenue_per_hour),
        priority_score: Number(projectForm.priority_score),
        max_workers: Number(projectForm.max_workers),
        required_skills: projectForm.required_skills || null,
        is_active: projectForm.is_active,
      });
      setProjectForm(initialProjectForm);
      showToast("Project created", "success");
      await loadProjects();
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingProject(false);
    }
  };

  const handleCreateAssignment = async (event) => {
    event.preventDefault();
    if (!canCreateAssignment) return;

    setSavingAssignment(true);
    setError("");
    try {
      await api.post("/labor/assignments", {
        prisoner_id: Number(assignmentForm.prisoner_id),
        project_id: Number(assignmentForm.project_id),
        assignment_date: assignmentForm.assignment_date,
        hours_assigned: Number(assignmentForm.hours_assigned),
      });
      setAssignmentForm(initialAssignmentForm);
      showToast("Assignment created", "success");
      setAssignmentPage(1);
      await loadAssignments(1, assignmentFilters);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleCreatePerformance = async (event) => {
    event.preventDefault();
    if (!canManageLabor) return;

    setSavingPerformance(true);
    setError("");
    try {
      await api.post("/labor/performance", {
        prisoner_id: Number(performanceForm.prisoner_id),
        project_id: Number(performanceForm.project_id),
        work_date: performanceForm.work_date,
        productivity: Number(performanceForm.productivity),
        notes: performanceForm.notes || null,
      });
      setPerformanceForm(initialPerformanceForm);
      showToast("Performance recorded", "success");
      setPerformancePage(1);
      await loadPerformance(1, performanceFilters);
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingPerformance(false);
    }
  };

  const handleDeleteProject = async (project) => {
    const confirmed = window.confirm(`Delete project "${project.project_name}"?`);
    if (!confirmed) return;

    setError("");
    try {
      await api.delete(`/labor/projects/${project.project_id}`);
      showToast("Project deleted", "success");
      await loadProjects();
      await reloadAssignments();
      await reloadPerformance();
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  const handleDeleteAssignment = async (assignment) => {
    const confirmed = window.confirm(`Delete assignment for ${assignment.prisoner_name || assignment.prisoner_id}?`);
    if (!confirmed) return;

    setError("");
    try {
      await api.delete(`/labor/assignments/${assignment.assignment_id}`);
      showToast("Assignment deleted", "success");
      await reloadAssignments(assignmentPage);
      await loadProjects();
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      showToast(message, "error");
    }
  };

  const applyAssignmentFilters = async () => {
    setAssignmentPage(1);
    await loadAssignments(1, assignmentFilters);
  };

  const clearAssignmentFilters = async () => {
    setAssignmentFilters(initialAssignmentFilters);
    setAssignmentPage(1);
    await loadAssignments(1, initialAssignmentFilters);
  };

  const applyPerformanceFilters = async () => {
    setPerformancePage(1);
    await loadPerformance(1, performanceFilters);
  };

  const clearPerformanceFilters = async () => {
    setPerformanceFilters(initialPerformanceFilters);
    setPerformancePage(1);
    await loadPerformance(1, initialPerformanceFilters);
  };

  const projectStatus = (project) => {
    if (!project.is_active) return { label: "Inactive", className: "status-inactive" };
    if (project.current_workers >= project.max_workers) return { label: "Full", className: "status-warning" };
    return { label: "Active", className: "status-active" };
  };

  const productivityBadge = (value) => {
    const score = Number(value ?? 0);
    if (score >= 80) return "status-active";
    if (score >= 50) return "status-warning";
    return "status-inactive";
  };

  const sortedProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase();
    const filtered = projects.filter((project) => {
      if (!search) return true;
      return (
        includesText(project.project_name, search) ||
        includesText(project.location_name, search) ||
        includesText(project.required_skills, search)
      );
    });
    return sortByField(filtered, projectSort);
  }, [projects, projectSearch, projectSort]);

  const sortedAssignments = useMemo(() => {
    // Build lookup maps so that for Viewer (who gets LaborAssignmentReadBasic without joined names)
    // we can still display nice prisoner/project names using data we already loaded (projects + prisoners).
    // This makes "Assignments" section actually show useful data instead of only #IDs.
    // Safe against project_id / prisoner_id being null (defensive after the backend filter + relaxed Basic schema).
    const projectNameById = new Map(projects.map((p) => [p.project_id, p.project_name]));
    const prisonerNameById = new Map(prisoners.map((pr) => [pr.prisoner_id, pr.full_name]));

    const search = assignmentSearch.trim().toLowerCase();
    const enriched = assignments.map((assignment) => {
      const pid = assignment.prisoner_id;
      const projid = assignment.project_id;
      const pn = assignment.prisoner_name
        || (pid != null ? prisonerNameById.get(pid) : null)
        || (pid != null ? `#${pid}` : '#?');
      const projn = assignment.project_name
        || (projid != null ? projectNameById.get(projid) : null)
        || (projid != null ? `#${projid}` : '#?');
      return {
        ...assignment,
        prisoner_name: pn,
        project_name: projn,
      };
    });

    const filtered = enriched.filter((assignment) => {
      if (!search) return true;
      return (
        includesText(assignment.prisoner_name, search) ||
        includesText(assignment.project_name, search) ||
        includesText(assignment.assigned_by_name, search)
      );
    });
    return sortByField(filtered, assignmentSort);
  }, [assignments, assignmentSearch, assignmentSort, projects, prisoners]);

  const sortedPerformance = useMemo(() => {
    const search = performanceSearch.trim().toLowerCase();
    const filtered = performanceRows.filter((record) => {
      if (!search) return true;
      return (
        includesText(record.prisoner_name, search) ||
        includesText(record.project_name, search) ||
        includesText(record.notes, search)
      );
    });
    return sortByField(filtered, performanceSort);
  }, [performanceRows, performanceSearch, performanceSort]);

  const prisonerOptions = useMemo(() => {
    const options = [...filteredPrisoners];
    const assignmentSelected = prisoners.find((item) => String(item.prisoner_id) === String(assignmentForm.prisoner_id));
    const performanceSelected = prisoners.find((item) => String(item.prisoner_id) === String(performanceForm.prisoner_id));
    if (assignmentSelected && !options.some((item) => item.prisoner_id === assignmentSelected.prisoner_id)) options.unshift(assignmentSelected);
    if (performanceSelected && !options.some((item) => item.prisoner_id === performanceSelected.prisoner_id)) options.unshift(performanceSelected);
    return options;
  }, [filteredPrisoners, prisoners, assignmentForm.prisoner_id, performanceForm.prisoner_id]);

  // Viewer: hide the entire left action column (ActionSidebar returns null for empty actions anyway).
  // Omitting .page-action-column makes .page-main-data take full width -> content "pushed up", no wasted left space, cleaner for Viewer.
  const showActionColumn = !isViewer; // Only non-Viewer (Guard/Warden/Admin) see create/log actions

  return (
    <>
    <div className="page-action-layout">
      {showActionColumn && (
        <div className="page-action-column">
          <ActionSidebar
            title="Actions"
            actions={[
              ...(canManageProjects ? [{ label: "+ Create Project", onClick: () => setShowCreateProject(true), variant: "create" }] : []),
              ...(canManageLabor ? [{ label: "+ Create Assignment", onClick: () => setShowCreateAssignment(true), variant: "create" }] : []),
              // Only show Log Performance for non-Viewer roles (Guard/Warden/Admin)
              ...(!isViewer ? [{ label: "Log Performance", onClick: () => setShowLogPerformance(true) }] : []),
            ]}
          />
        </div>
      )}

      <div className="page-main-data">
      <div style={{ display: 'block' }}>
        <div className="labor-stack">
          {/* Viewer layout: tight vertical rhythm (8px or less) between Projects and Assignments after hiding Performance sections.
             This + omitting left action column + hiding filter-bar below makes the page clean, balanced, no large empty regions. */}
          <section className="panel" style={isViewer ? { marginBottom: '8px' } : {}}>
            <div className="section-head">
              <div>
                <h2>Labor Projects</h2>
                <p>Current workers are counted from today&apos;s assignments.</p>
              </div>
              <button className="secondary-btn" type="button" onClick={loadProjects} disabled={loadingProjects}>Refresh</button>
            </div>

            <div className="top-search-row">
              <label>
                Search projects
                <input value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} placeholder="Name, location, skills" />
              </label>
              <label>
                Sort
                <select value={projectSort} onChange={(e) => setProjectSort(e.target.value)}>
                  {projectSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Note: global error banner kept here for action failures (create/update/delete). Load errors no longer setError to avoid "Network Error" after data has loaded. */}
            {error && <div className="error-msg">{error}</div>}

            {loadingProjects ? (
              <SectionLoading label="Loading projects..." />
            ) : sortedProjects.length === 0 ? (
              <div className="loading-state"><p>No labor projects found</p></div>
            ) : (
              <div className="table-wrap table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Max Workers</th>
                      <th>Current Workers</th>
                      <th>Revenue / Hour</th>
                      <th>Status</th>
                      {/* Viewer: no Actions column at all (no edit/delete). Column entirely omitted for clean table. */}
                      {!isViewer && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((project) => {
                      const status = projectStatus(project);
                      const location = project.location_name || (project.location_id ? `#${project.location_id}` : "Unassigned");
                      return (
                        <tr key={project.project_id}>
                          <td>
                            <div className="project-summary">
                              <strong>{project.project_name}</strong>
                              <span className="mini-muted">Priority: {project.priority_score}</span>
                            </div>
                          </td>
                          <td>
                            <div className="project-summary">
                              <strong>{location}</strong>
                              <span className="mini-muted">{project.required_skills || "No skills specified"}</span>
                            </div>
                          </td>
                          <td>{project.max_workers}</td>
                          <td>{project.current_workers}</td>
                          <td>{formatMoney(project.revenue_per_hour)}</td>
                          <td>
                            <span className={`status-badge ${status.className}`}>{status.label}</span>
                            <div className="mini-muted">{project.open_slots} open</div>
                          </td>
                          {/* Viewer sees no action buttons (Edit/Delete guarded by !isViewer and canManage checks). */}
                          {!isViewer && (
                            <td>
                              <div className="project-actions">
                                {canManageProjects && (
                                  <>
                                    <button className="btn-sm btn-edit" type="button" onClick={() => setEditingProject(project)}>Edit</button>
                                    <button className="btn-sm btn-delete" type="button" onClick={() => handleDeleteProject(project)}>Delete</button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Viewer: smaller marginTop + previous marginBottom on Projects => sections are visually closer, balanced, no large whitespace after Performance was hidden. Order: Projects then Assignments. */}
          <section className="panel" style={isViewer ? { marginTop: '8px' } : {}}>
            <div className="section-head">
              <div>
                <h2>Assignments</h2>
                <p>Search, filter, sort and page through assignment history.</p>
              </div>
              <button className="secondary-btn" type="button" onClick={() => loadAssignments(assignmentPage, assignmentFilters)} disabled={loadingAssignments}>Refresh</button>
            </div>

            <div className="top-search-row">
              <label>
                Search assignments
                <input value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)} placeholder="Prisoner, project, assigned by" />
              </label>
              <label>
                Sort
                <select value={assignmentSort} onChange={(e) => setAssignmentSort(e.target.value)}>
                  {assignmentSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Viewer: hide the server-side filter-bar entirely (filters are not sent to backend for isViewer; would be ignored anyway).
                Top search + client-side filter in sortedAssignments + pagination is sufficient and keeps UI clean/compact for Viewer. */}
            {!isViewer && (
            <div className="filter-bar">
              <label>
                Prisoner
                <input value={assignmentFilters.prisoner_id} onChange={(e) => setAssignmentFilters({ ...assignmentFilters, prisoner_id: e.target.value })} placeholder="Prisoner ID" />
              </label>
              <label>
                Project
                <select value={assignmentFilters.project_id} onChange={(e) => setAssignmentFilters({ ...assignmentFilters, project_id: e.target.value })}>
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>{project.project_name}</option>
                  ))}
                </select>
              </label>
              <div className="toolbar-row">
                <button className="primary-btn" type="button" onClick={applyAssignmentFilters}>Apply</button>
                <button className="secondary-btn" type="button" onClick={clearAssignmentFilters}>Clear</button>
              </div>
            </div>
            )}

            <div className="pagination-bar">
              <div className="search-status">Page {assignmentPage} {loadingAssignments ? "• loading" : ""}</div>
              <div className="controls">
                <button className="secondary-btn" type="button" disabled={assignmentPage <= 1 || loadingAssignments} onClick={async () => {
                  const nextPage = Math.max(1, assignmentPage - 1);
                  setAssignmentPage(nextPage);
                  await loadAssignments(nextPage, assignmentFilters);
                }}>Prev</button>
                <button className="secondary-btn" type="button" disabled={!assignmentHasNext || loadingAssignments} onClick={async () => {
                  const nextPage = assignmentPage + 1;
                  setAssignmentPage(nextPage);
                  await loadAssignments(nextPage, assignmentFilters);
                }}>Next</button>
              </div>
            </div>

            {loadingAssignments ? (
              <SectionLoading label="Loading assignments..." />
            ) : sortedAssignments.length === 0 ? (
              <div className="loading-state"><p>No assignments found</p></div>
            ) : (
              <div className="table-wrap compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>Prisoner Name</th>
                      <th>Project</th>
                      <th>Assigned Date</th>
                      <th>Hours</th>
                      <th>Assigned By</th>
                      {!isViewer && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAssignments.map((assignment) => (
                      <tr key={assignment.assignment_id}>
                        <td>{assignment.prisoner_name || (assignment.prisoner_id != null ? `#${assignment.prisoner_id}` : '#?')}</td>
                        <td>{assignment.project_name || (assignment.project_id != null ? `#${assignment.project_id}` : '#?')}</td>
                        <td>{formatDateOnly(assignment.assignment_date)}</td>
                        <td>{formatDecimal(assignment.hours_assigned)}</td>
                        <td>{assignment.assigned_by_name || assignment.assigned_by || "-"}</td>
                        {!isViewer && (
                          <td>
                            <div className="table-actions">
                              {canManageLabor && (
                                <>
                                  <button className="btn-sm btn-edit" type="button" onClick={() => setEditingAssignment(assignment)}>Edit</button>
                                  <button className="btn-sm btn-delete" type="button" onClick={() => handleDeleteAssignment(assignment)}>Delete</button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Performance History + Log fully hidden for Viewer (role check on current_user.role).
             Combined with skipping loadPerformance in refreshAll + no sidebar Log action => no wasted space, no Network Error from perf endpoint. */}
          {!isViewer && (
          <section className="panel">
            <div className="history-header">
              <div>
                <h2>Performance History</h2>
                <p>Search, filter, sort and page through daily performance records.</p>
              </div>
              <div className="toolbar-row">
                <button className="secondary-btn" type="button" onClick={() => loadPerformance(performancePage, performanceFilters)} disabled={loadingPerformance}>Refresh</button>
                <button className="secondary-btn" type="button" onClick={() => setIsHistoryOpen((open) => !open)}>
                  {isHistoryOpen ? "[-]" : "[+]"}
                </button>
              </div>
            </div>
            {isHistoryOpen && (
              <>
                <div className="top-search-row">
                  <label>
                    Search records
                    <input value={performanceSearch} onChange={(e) => setPerformanceSearch(e.target.value)} placeholder="Prisoner, project, notes" />
                  </label>
                  <label>
                    Sort
                    <select value={performanceSort} onChange={(e) => setPerformanceSort(e.target.value)}>
                      {performanceSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="history-filters">
                  <label>
                    Prisoner ID
                    <input type="number" min="1" value={performanceFilters.prisoner_id} onChange={(e) => setPerformanceFilters({ ...performanceFilters, prisoner_id: e.target.value })} placeholder="Prisoner ID" />
                  </label>
                  <label>
                    Project
                    <select value={performanceFilters.project_id} onChange={(e) => setPerformanceFilters({ ...performanceFilters, project_id: e.target.value })}>
                      <option value="">All projects</option>
                      {projects.map((project) => (
                        <option key={project.project_id} value={project.project_id}>{project.project_name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="toolbar-row">
                    <button className="primary-btn" type="button" onClick={applyPerformanceFilters}>Apply</button>
                    <button className="secondary-btn" type="button" onClick={clearPerformanceFilters}>Clear</button>
                  </div>
                </div>

                <div className="pagination-bar">
                  <div className="search-status">Page {performancePage} {loadingPerformance ? "• loading" : ""}</div>
                  <div className="controls">
                    <button className="secondary-btn" type="button" disabled={performancePage <= 1 || loadingPerformance} onClick={async () => {
                      const nextPage = Math.max(1, performancePage - 1);
                      setPerformancePage(nextPage);
                      await loadPerformance(nextPage, performanceFilters);
                    }}>Prev</button>
                    <button className="secondary-btn" type="button" disabled={!performanceHasNext || loadingPerformance} onClick={async () => {
                      const nextPage = performancePage + 1;
                      setPerformancePage(nextPage);
                      await loadPerformance(nextPage, performanceFilters);
                    }}>Next</button>
                  </div>
                </div>

                {loadingPerformance ? (
                  <SectionLoading label="Loading performance history..." />
                ) : sortedPerformance.length === 0 ? (
                  <div className="loading-state"><p>No performance records found</p></div>
                ) : (
                  <div className="table-wrap compact-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Prisoner</th>
                          <th>Project</th>
                          <th>Date</th>
                          <th>Score</th>
                          <th>Evaluated By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPerformance.map((record) => (
                          <tr key={record.performance_id}>
                            <td>{record.prisoner_name || `#${record.prisoner_id}`}</td>
                            <td>{record.project_name || `#${record.project_id}`}</td>
                            <td>{formatDateOnly(record.work_date)}</td>
                            <td><span className={`status-badge score-pill ${productivityBadge(record.productivity)}`}>{formatDecimal(record.productivity)}</span></td>
                            <td>{record.evaluated_by_name || record.evaluated_by || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
          )}
        </div> {/* close labor-stack */}
      </div> {/* close style block */}

      {/* Create modals as popups from left sidebar */}
      {showCreateProject && (
        <div className="modal-overlay" onClick={() => setShowCreateProject(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Project</h3>
              <button className="close-btn" onClick={() => setShowCreateProject(false)}>×</button>
            </div>
            {!canManageProjects && <div className="readonly-note">Admin and Warden only.</div>}
            <form className="form-grid" onSubmit={handleCreateProject}>
              <label>
                Name
                <input value={projectForm.project_name} onChange={(e) => setProjectForm({ ...projectForm, project_name: e.target.value })} required disabled={!canManageProjects} />
              </label>
              <label>
                Location
                <select value={projectForm.location_id} onChange={(e) => setProjectForm({ ...projectForm, location_id: e.target.value })} disabled={!canManageProjects || loadingLocations}>
                  <option value="">Unassigned</option>
                  {locations.map((location) => (
                    <option key={location.location_id} value={location.location_id}>{location.location_name} ({location.capacity})</option>
                  ))}
                </select>
              </label>
              <label>
                Revenue / Hour
                <input type="number" step="0.01" min="0" value={projectForm.revenue_per_hour} onChange={(e) => setProjectForm({ ...projectForm, revenue_per_hour: e.target.value })} required disabled={!canManageProjects} />
              </label>
              <label>
                Priority Score
                <input type="number" min="0" value={projectForm.priority_score} onChange={(e) => setProjectForm({ ...projectForm, priority_score: e.target.value })} disabled={!canManageProjects} />
              </label>
              <label>
                Max Workers
                <input type="number" min="1" value={projectForm.max_workers} onChange={(e) => setProjectForm({ ...projectForm, max_workers: e.target.value })} required disabled={!canManageProjects} />
              </label>
              <label>
                Required Skills
                <textarea value={projectForm.required_skills} onChange={(e) => setProjectForm({ ...projectForm, required_skills: e.target.value })} disabled={!canManageProjects} />
              </label>
              <label>
                <input type="checkbox" checked={projectForm.is_active} onChange={(e) => setProjectForm({ ...projectForm, is_active: e.target.checked })} disabled={!canManageProjects} /> Active
              </label>
              <div className="modal-buttons">
                <button className="primary-btn" type="submit" disabled={!canManageProjects || savingProject}>{savingProject ? "Creating..." : "Create Project"}</button>
                <button className="secondary-btn" type="button" onClick={() => setShowCreateProject(false)} disabled={savingProject}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateAssignment && canManageLabor && (
        <div className="modal-overlay" onClick={() => setShowCreateAssignment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Assignment</h3>
              <button className="close-btn" onClick={() => setShowCreateAssignment(false)}>×</button>
            </div>
            <form className="form-grid" onSubmit={handleCreateAssignment}>
              <label>
                Search prisoner
                <input value={prisonerSearch} onChange={(e) => setPrisonerSearch(e.target.value)} placeholder="Type prisoner name" />
              </label>
              <div className="searchable-picker">
                <div className="search-status">
                  {loadingPrisoners ? "Loading prisoners..." : `Showing ${prisonerOptions.length} match(es)`}
                </div>
                <label>
                  Prisoner
                  <select value={assignmentForm.prisoner_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, prisoner_id: e.target.value })} required disabled={loadingPrisoners}>
                    <option value="">Select prisoner by name</option>
                    {prisonerOptions.map((prisoner) => (
                      <option key={prisoner.prisoner_id} value={prisoner.prisoner_id}>
                        {prisoner.full_name} (#{prisoner.prisoner_id})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mini-muted">Selected: {selectedPrisonerName || "none"}</div>
              </div>
              <label>
                Project
                <select value={assignmentForm.project_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, project_id: e.target.value })} required>
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>{project.project_name} ({project.current_workers}/{project.max_workers})</option>
                  ))}
                </select>
              </label>
              <label>
                Assignment Date
                <input type="date" value={assignmentForm.assignment_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, assignment_date: e.target.value })} required />
              </label>
              <label>
                Hours Assigned
                <input type="number" step="0.25" min="0.25" value={assignmentForm.hours_assigned} onChange={(e) => setAssignmentForm({ ...assignmentForm, hours_assigned: e.target.value })} required />
              </label>
              <div className="modal-buttons">
                <button className="primary-btn" type="submit" disabled={savingAssignment}>{savingAssignment ? "Assigning..." : "Assign Prisoner"}</button>
                <button className="secondary-btn" type="button" onClick={() => setShowCreateAssignment(false)} disabled={savingAssignment}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hide Log Performance modal for Viewer too */}
      {!isViewer && showLogPerformance && (
        <div className="modal-overlay" onClick={() => setShowLogPerformance(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Performance</h3>
              <button className="close-btn" onClick={() => setShowLogPerformance(false)}>×</button>
            </div>
            {!canManageLabor && <div className="readonly-note">Limited to Admin, Warden, Guard.</div>}
            <form className="form-grid" onSubmit={handleCreatePerformance}>
              <div className="searchable-picker">
                <div className="search-status">
                  {loadingPrisoners ? "Loading prisoners..." : `Showing ${prisonerOptions.length} match(es)`}
                </div>
                <label>
                  Prisoner
                  <select value={performanceForm.prisoner_id} onChange={(e) => setPerformanceForm({ ...performanceForm, prisoner_id: e.target.value })} required disabled={!canManageLabor || loadingPrisoners}>
                    <option value="">Select prisoner by name</option>
                    {prisonerOptions.map((prisoner) => (
                      <option key={prisoner.prisoner_id} value={prisoner.prisoner_id}>
                        {prisoner.full_name} (#{prisoner.prisoner_id})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mini-muted">Selected: {selectedPerformancePrisonerName || "none"}</div>
              </div>
              <label>
                Project
                <select value={performanceForm.project_id} onChange={(e) => setPerformanceForm({ ...performanceForm, project_id: e.target.value })} required disabled={!canManageLabor}>
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>{project.project_name}</option>
                  ))}
                </select>
              </label>
              <label>
                Work Date
                <input type="date" value={performanceForm.work_date} onChange={(e) => setPerformanceForm({ ...performanceForm, work_date: e.target.value })} required disabled={!canManageLabor} />
              </label>
              <label>
                Productivity
                <input type="number" step="0.01" min="0" max="100" value={performanceForm.productivity} onChange={(e) => setPerformanceForm({ ...performanceForm, productivity: e.target.value })} required disabled={!canManageLabor} />
              </label>
              <label>
                Notes
                <textarea value={performanceForm.notes} onChange={(e) => setPerformanceForm({ ...performanceForm, notes: e.target.value })} disabled={!canManageLabor} />
              </label>
              <div className="modal-buttons">
                <button className="primary-btn" type="submit" disabled={!canManageLabor || savingPerformance}>{savingPerformance ? "Saving..." : "Save Performance"}</button>
                <button className="secondary-btn" type="button" onClick={() => setShowLogPerformance(false)} disabled={savingPerformance}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      )}

      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          locations={locations}
          onClose={() => setEditingProject(null)}
          onSaved={async () => {
            await loadProjects();
            await reloadAssignments();
            await reloadPerformance();
          }}
          showToast={showToast}
        />
      )}

      {editingAssignment && (
        <AssignmentEditModal
          assignment={editingAssignment}
          projects={projects}
          prisoners={prisoners}
          onClose={() => setEditingAssignment(null)}
          onSaved={async () => {
            await reloadAssignments();
            await loadProjects();
          }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div> {/* close page-main-data */}
  </div> {/* close page-action-layout */}
    </>
  );
}
