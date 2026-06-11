import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Lucide icons for clarity (core functionality first)
import {
  Users,
  MapPin,
  AlertTriangle,
  Activity,
  RefreshCw,
  Shield,
  ClipboardList,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Clock,
} from "lucide-react";

// ============================================
// CONFIG: Key Indicators - 4 core metrics
// ============================================
const KEY_INDICATORS = [
  {
    key: "users",
    title: "Active Staff",
    endpoint: "/users?active_only=true",
    icon: Users,
    accent: "#4f5df0",
    sub: "on duty",
  },
  {
    key: "prisoners",
    title: "In Custody",
    endpoint: "/prisoners",
    icon: UserCheck,
    accent: "#10a36e",
    sub: "current population",
  },
  {
    key: "locations",
    title: "Facilities",
    endpoint: "/locations",
    icon: MapPin,
    accent: "#d97706",
    sub: "locations tracked",
  },
  {
    key: "visits",
    title: "Pending Visits",
    endpoint: "/visits?status_filter=Pending&today_only=true",
    icon: Clock,
    accent: "#d64343",
    sub: "today's requests",
  },
];

// ============================================
// CONFIG: Quick Actions (role-based, priority order)
// ============================================
const QUICK_ACTIONS = [
  {
    label: "Duyệt Visit Requests",
    desc: "Approve or reject pending visitor requests",
    to: "/visits",
    icon: UserCheck,
    roles: ["Warden", "Guard", "Admin"],
  },
  {
    label: "Overloaded Locations",
    desc: "View facilities near or at capacity",
    to: "/locations",
    icon: MapPin,
    roles: ["Warden", "Admin"],
  },
  {
    label: "Log Daily Performance",
    desc: "Record prisoner work productivity score",
    to: "/labor",
    icon: ClipboardList,
    roles: ["Guard", "Admin", "Warden"],
  },
  {
    label: "Report Incident",
    desc: "Quickly log a new security or disciplinary event",
    to: "/incidents",
    icon: AlertTriangle,
    roles: ["Guard", "Admin", "Warden"],
  },
  {
    label: "Today's Assignments",
    desc: "View current labor and schedule assignments",
    to: "/schedules",
    icon: Activity,
    roles: ["Guard", "Admin", "Warden", "Viewer"],
  },
  {
    label: "Labor Productivity",
    desc: "Review daily performance and reports",
    to: "/labor",
    icon: TrendingUp,
    roles: ["Warden", "Guard", "Admin", "Viewer"],
  },
];

// ============================================
// Small reusable component: Key Indicator Card
// Focus on data + clarity first
// ============================================
function KeyIndicatorCard({ title, value, sub, icon: Icon, accent, loading }) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="metric-icon" style={{ background: "#f1f3f9" }} />
        <div>
          <div className="metric-title">{title}</div>
          <div className="metric-value">...</div>
          <div className="metric-sub">{sub}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card">
      <div
        className="metric-icon"
        style={{ background: `${accent}15`, color: accent }}
      >
        <Icon size={22} />
      </div>
      <div>
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
        <div className="metric-sub">{sub}</div>
      </div>
    </div>
  );
}

// ============================================
// Small reusable component: Quick Action Card
// Clickable via Link (navigation first, modals can be added later)
// ============================================
function QuickActionCard({ label, desc, to, icon: Icon }) {
  return (
    <Link to={to} className="quick-action">
      <div className="icon-wrap">
        <Icon size={20} />
      </div>
      <div className="qa-content">
        <div className="qa-label">{label}</div>
        <div className="qa-desc">{desc}</div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "Viewer";
  const isViewer = role === "Viewer";

  // State for core data
  const [stats, setStats] = useState({});
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [highOccupancy, setHighOccupancy] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Viewer-specific state (personalized Visit Requests)
  const [myRequests, setMyRequests] = useState([]);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false); // for direct request from dashboard for Viewer

  // ============================================
  // Data fetching - Core functionality
  // Fetches Key Indicators + supporting alert data
  // ============================================
  const loadDashboard = useCallback(async (isRefresh = false) => {
    setLoading(true);
    if (!isRefresh) setError("");

    try {
      const result = {};

      // 1. Key Indicators - parallel fetch
      await Promise.all(
        KEY_INDICATORS.map(async (card) => {
          try {
            const res = await api.get(card.endpoint);
            result[card.key] = Array.isArray(res.data) ? res.data.length : 0;
          } catch {
            result[card.key] = 0;
          }
        })
      );
      setStats(result);

      // 2. Recent incidents (for Operational Alerts)
      try {
        const incRes = await api.get("/incidents?page=1&page_size=6");
        const incidents = Array.isArray(incRes.data) ? incRes.data : [];
        setRecentIncidents(incidents.slice(0, 4));
      } catch {
        setRecentIncidents([]);
      }

      // 3. High occupancy locations (client-side calculation for alerts)
      try {
        const locRes = await api.get("/locations?page=1&page_size=100");
        const locations = Array.isArray(locRes.data) ? locRes.data : [];

        const high = locations
          .map((loc) => {
            const occ = loc.current_occupancy || 0;
            const cap = loc.capacity || 1;
            const pct = Math.round((occ / cap) * 100);
            return { ...loc, occupancyPct: pct };
          })
          .filter((loc) => loc.occupancyPct >= 80)
          .sort((a, b) => b.occupancyPct - a.occupancyPct)
          .slice(0, 4);

        setHighOccupancy(high);
      } catch {
        setHighOccupancy([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      const msg = parseApiError(err);
      setError(msg || "Failed to load operations data");
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // Viewer Dashboard Data Loading
  // Fetches only the current user's Visit Requests for personalized view
  // ============================================
  const loadViewerDashboard = useCallback(async (isRefresh = false) => {
    setViewerLoading(true);
    if (!isRefresh) setError("");

    try {
      // Fetch the Viewer's own requests (backend supports /requests/mine for Viewer)
      const res = await api.get("/visits/requests/mine");
      const requests = Array.isArray(res.data) ? res.data : [];
      setMyRequests(requests);

      setLastUpdated(new Date());
    } catch (err) {
      const msg = parseApiError(err);
      setError(msg || "Failed to load your requests");
      setMyRequests([]);
    } finally {
      setViewerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isViewer) {
      loadViewerDashboard();
    } else {
      loadDashboard();
    }
  }, [isViewer, loadDashboard, loadViewerDashboard]);

  const handleRefresh = () => {
    if (isViewer) {
      loadViewerDashboard();
    } else {
      loadDashboard(true);
    }
  };

  // Role-based filtering for Quick Actions (only used for non-Viewer staff dashboard)
  const visibleActions = QUICK_ACTIONS.filter(
    (action) => action.roles.includes(role) || role === "Admin"
  );

  // Simple date formatter for alerts
  const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // ============================================
  // Viewer-specific computed values (from /requests/mine)
  // ============================================
  const viewerStats = {
    pending: myRequests.filter(r => r.status === "Pending").length,
    approved: myRequests.filter(r => r.status === "Approved").length,
    rejected: myRequests.filter(r => r.status === "Rejected").length,
    total: myRequests.length,
  };

  const recentMyRequests = [...myRequests]
    .sort((a, b) => new Date(b.requested_date || 0) - new Date(a.requested_date || 0))
    .slice(0, 6);

  return (
    <div className="ops-console">
      {/* ============================================
          HEADER - Operations Console
          ============================================ */}
      <div className="ops-header">
        <div>
          {isViewer ? (
            <>
              <div className="eyebrow">Personal Dashboard</div>
              <h2>My Dashboard</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                Chào mừng trở lại! Dưới đây là tình trạng các yêu cầu thăm gặp của bạn.
              </p>
            </>
          ) : (
            <>
              <div className="eyebrow">Facility Operations</div>
              <h2>Operations Console</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                Real-time overview and quick actions for daily prison operations.
              </p>
            </>
          )}
        </div>

        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={isViewer ? viewerLoading : loading}
        >
          <RefreshCw size={16} />
          {(isViewer ? viewerLoading : loading) ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error state (core feedback) */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}. Some data may be stale.</span>
        </div>
      )}

      {/* ============================================
          ROLE-BASED DASHBOARD CONTENT
          ============================================ */}
      {isViewer ? (
        /* VIEWER DASHBOARD - Focused on personal Visit Requests */
        <div>
          {/* KEY INDICATORS - 4 personal stats cards */}
          <section>
            <div className="section-head" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Your Request Summary</span>
              {lastUpdated && (
                <div className="last-updated">
                  <Clock size={14} /> Last updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>

            {viewerLoading ? (
              <div className="loading-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="loading-card" />
                ))}
              </div>
            ) : (
              <div className="metric-grid">
                <KeyIndicatorCard
                  title="Pending"
                  value={viewerStats.pending}
                  sub="awaiting review"
                  icon={Clock}
                  accent="#d97706"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Approved"
                  value={viewerStats.approved}
                  sub="visits granted"
                  icon={UserCheck}
                  accent="#10a36e"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Rejected"
                  value={viewerStats.rejected}
                  sub="not approved"
                  icon={AlertTriangle}
                  accent="#d64343"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Total Requests"
                  value={viewerStats.total}
                  sub="you have submitted"
                  icon={ClipboardList}
                  accent="#4f5df0"
                  loading={false}
                />
              </div>
            )}
          </section>

          {/* QUICK ACTIONS - Tailored for Viewer */}
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">Quick Actions</span>
                <h3 style={{ marginTop: 2 }}>What would you like to do?</h3>
              </div>
            </div>

            <div className="quick-actions">
              {/* Big primary button to open request modal directly */}
              <button 
                className="quick-action" 
                onClick={() => setShowRequestModal(true)}
                style={{ 
                  border: "2px solid var(--accent)", 
                  background: "var(--highlight)",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <div className="icon-wrap" style={{ background: "var(--accent-soft)" }}>
                  <UserCheck size={22} />
                </div>
                <div className="qa-content">
                  <div className="qa-label" style={{ fontSize: "1.05rem" }}>Request New Visit</div>
                  <div className="qa-desc">Submit a new visit request for a prisoner</div>
                </div>
              </button>

              {/* Secondary action - go to full list */}
              <Link to="/visits" className="quick-action">
                <div className="icon-wrap">
                  <ClipboardList size={20} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">View My Requests</div>
                  <div className="qa-desc">See the complete history and current status of all your requests</div>
                </div>
              </Link>
            </div>
          </section>

          {/* RECENT REQUESTS - Last 5-6 of the viewer's requests */}
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">Recent Activity</span>
                <h3 style={{ marginTop: 2 }}>My Recent Visit Requests</h3>
              </div>
            </div>

            {viewerLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading your recent requests...</p>
              </div>
            ) : recentMyRequests.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Prisoner</th>
                      <th>Visit Date</th>
                      <th>Status</th>
                      <th style={{ width: 80 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMyRequests.map((req) => {
                      const statusClass = 
                        req.status === "Approved" ? "status-active" : 
                        req.status === "Rejected" ? "status-inactive" : "";
                      return (
                        <tr key={req.request_id}>
                          <td>#{req.prisoner_id}</td>
                          <td>{req.requested_date ? new Date(req.requested_date).toLocaleDateString() : "-"}</td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>
                            <Link 
                              to="/visits" 
                              className="btn-sm btn-edit"
                              title="View details on My Visit Requests page"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                padding: "28px 16px", 
                textAlign: "center", 
                background: "var(--bg-elevated)", 
                borderRadius: 12,
                border: "1px solid var(--line)"
              }}>
                <p style={{ marginBottom: 12, color: "var(--muted)" }}>
                  Bạn chưa có yêu cầu thăm gặp nào.
                </p>
                <button 
                  className="primary-btn" 
                  onClick={() => setShowRequestModal(true)}
                >
                  Request New Visit
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <>
          {/* STAFF / OPERATIONS DASHBOARD - Original full view */}
          {/* KEY INDICATORS (4 core cards) */}
          <section>
            <div className="section-head" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Key Indicators</span>
              {lastUpdated && (
                <div className="last-updated">
                  <Clock size={14} /> Last updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="loading-card" />
                ))}
              </div>
            ) : (
              <div className="metric-grid">
                {KEY_INDICATORS.map((card) => (
                  <KeyIndicatorCard
                    key={card.key}
                    title={card.title}
                    value={stats[card.key] ?? 0}
                    sub={card.sub}
                    icon={card.icon}
                    accent={card.accent}
                    loading={false}
                  />
                ))}
              </div>
            )}
          </section>

          {/* QUICK ACTIONS + OPERATIONAL ALERTS */}
          <div className="split-grid" style={{ alignItems: "start" }}>
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Quick Actions</span>
                  <h3 style={{ marginTop: 2 }}>Common daily tasks</h3>
                </div>
              </div>

              {visibleActions.length > 0 ? (
                <div className="quick-actions">
                  {visibleActions.map((action, idx) => (
                    <QuickActionCard
                      key={idx}
                      label={action.label}
                      desc={action.desc}
                      to={action.to}
                      icon={action.icon}
                    />
                  ))}
                </div>
              ) : (
                <p className="muted">No quick actions available for your role.</p>
              )}

              <div style={{ marginTop: 16, fontSize: "0.8rem", color: "var(--muted)" }}>
                Actions respect your current role permissions.
              </div>
            </section>

            {/* OPERATIONAL ALERTS */}
            <section className="panel alerts-panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Operational Alerts</span>
                  <h3 style={{ marginTop: 2 }}>Requires attention</h3>
                </div>
                <Link to="/incidents" className="muted-link" style={{ fontSize: "0.85rem" }}>
                  View incidents →
                </Link>
              </div>

              {/* Near capacity warnings */}
              {highOccupancy.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#8a6f3a", marginBottom: 6 }}>
                    NEAR OR AT CAPACITY
                  </div>
                  <div className="alert-list">
                    {highOccupancy.map((loc, i) => (
                      <div key={i} className="alert-item high">
                        <div className="alert-icon">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="alert-text">
                          <strong>{loc.location_name}</strong> — {loc.occupancyPct}% full
                          <div style={{ fontSize: "0.8rem", marginTop: 2 }}>
                            {loc.current_occupancy || 0} / {loc.capacity} inmates
                          </div>
                        </div>
                        <div className="alert-meta">Review needed</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent incidents */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                  RECENT INCIDENTS
                </div>

                {recentIncidents.length === 0 ? (
                  <div className="alert-item">
                    <div className="alert-icon">
                      <Shield size={18} />
                    </div>
                    <div className="alert-text">No recent incidents reported.</div>
                  </div>
                ) : (
                  <div className="alert-list">
                    {recentIncidents.map((inc, idx) => (
                      <div key={idx} className="alert-item">
                        <div className="alert-icon">
                          <AlertCircle size={18} />
                        </div>
                        <div className="alert-text">
                          <strong>{inc.incident_type || "Incident"}</strong>
                          {inc.severity && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: "0.75rem",
                                padding: "1px 7px",
                                borderRadius: 999,
                                background:
                                  inc.severity === "High"
                                    ? "#ffe8e8"
                                    : inc.severity === "Medium"
                                    ? "#f7e9c4"
                                    : "#e6f4ea",
                                color:
                                  inc.severity === "High"
                                    ? "#9f3e31"
                                    : inc.severity === "Medium"
                                    ? "#7a5c00"
                                    : "#0f6b4e",
                              }}
                            >
                              {inc.severity}
                            </span>
                          )}
                          <div style={{ fontSize: "0.82rem", marginTop: 3, color: "var(--muted)" }}>
                            {inc.description ? inc.description.slice(0, 70) : "No description"}...
                          </div>
                        </div>
                        <div className="alert-meta">{formatShortDate(inc.incident_date)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <Link to="/incidents" className="muted-link">
                  Full incident log →
                </Link>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Footer / status note */}
      <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--muted)", marginTop: 8 }}>
        Data refreshed from backend. Use the Refresh button for the latest snapshot.
        {isViewer && " (Personal read-only view)"}
      </div>

      {/* Request New Visit Modal for Viewer (opened directly from Quick Action) */}
      {isViewer && showRequestModal && (
        <RequestVisitModalForDashboard 
          onClose={() => setShowRequestModal(false)} 
          onSuccess={() => {
            // Refresh viewer data after successful request creation
            loadViewerDashboard();
            setShowRequestModal(false);
          }}
        />
      )}
    </div>
  );
}

/* Small self-contained modal for creating request directly from Viewer Dashboard */
function RequestVisitModalForDashboard({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    prisoner_id: "",
    requested_date: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/visits/request", {
        prisoner_id: Number(form.prisoner_id),
        requested_date: form.requested_date,
      });
      onSuccess(); // will refresh dashboard data and close
    } catch (err) {
      setError(parseApiError(err) || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request a Visit</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit} style={{ padding: "18px 20px 20px" }}>
          <label>
            Prisoner ID
            <input 
              type="number" 
              value={form.prisoner_id} 
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} 
              required 
            />
          </label>
          <label>
            Requested date
            <input 
              type="datetime-local" 
              value={form.requested_date} 
              onChange={(e) => setForm({ ...form, requested_date: e.target.value })} 
              required 
            />
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
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
