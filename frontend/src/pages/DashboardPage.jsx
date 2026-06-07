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

  // State for core data
  const [stats, setStats] = useState({});
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [highOccupancy, setHighOccupancy] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

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

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    loadDashboard(true);
  };

  // Role-based filtering for Quick Actions
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

  return (
    <div className="ops-console">
      {/* ============================================
          HEADER - Operations Console
          ============================================ */}
      <div className="ops-header">
        <div>
          <div className="eyebrow">Facility Operations</div>
          <h2>Operations Console</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Real-time overview and quick actions for daily prison operations.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
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
          KEY INDICATORS (4 core cards)
          Real-time data from backend
          ============================================ */}
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
          // Simple loading placeholders (structure first)
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

      {/* ============================================
          QUICK ACTIONS + OPERATIONAL ALERTS
          Two-column layout for core ops view
          ============================================ */}
      <div className="split-grid" style={{ alignItems: "start" }}>
        {/* QUICK ACTIONS - Role aware, actionable */}
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

        {/* OPERATIONAL ALERTS - Important signals */}
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

      {/* Footer / status note */}
      <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--muted)", marginTop: 8 }}>
        Data refreshed from backend. Use the Refresh button for the latest snapshot.
        {role === "Viewer" && " (Read-only mode)"}
      </div>
    </div>
  );
}
