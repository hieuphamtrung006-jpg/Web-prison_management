import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, parseApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
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

const OVERVIEW_CARDS = [
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

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "Viewer";

  const [stats, setStats] = useState({});
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [highOccupancy, setHighOccupancy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    setLoading(true);
    if (!isRefresh) setError("");

    try {
      const result = {};

      // Overview counts
      await Promise.all(
        OVERVIEW_CARDS.map(async (card) => {
          try {
            const res = await api.get(card.endpoint);
            result[card.key] = Array.isArray(res.data) ? res.data.length : 0;
          } catch {
            result[card.key] = 0;
          }
        })
      );
      setStats(result);

      // Recent incidents for alerts
      try {
        const incRes = await api.get("/incidents?page=1&page_size=6");
        const incidents = Array.isArray(incRes.data) ? incRes.data : [];
        setRecentIncidents(incidents.slice(0, 4));
      } catch {
        setRecentIncidents([]);
      }

      // High occupancy locations (client-side computation)
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

  // Role-based Quick Actions
  const allActions = [
    {
      label: "Duyệt Visit Requests",
      desc: "Approve or reject pending visitor requests",
      to: "/visits",
      icon: UserCheck,
      roles: ["Warden", "Guard", "Admin"],
    },
    {
      label: "Overloaded Locations",
      desc: "View facilities near capacity",
      to: "/locations",
      icon: MapPin,
      roles: ["Warden", "Admin"],
    },
    {
      label: "Labor Productivity",
      desc: "Review daily performance & reports",
      to: "/labor",
      icon: TrendingUp,
      roles: ["Warden", "Guard", "Admin", "Viewer"],
    },
    {
      label: "Log Daily Performance",
      desc: "Record prisoner work productivity",
      to: "/labor",
      icon: ClipboardList,
      roles: ["Guard", "Admin", "Warden"],
    },
    {
      label: "Report Incident",
      desc: "Quickly log a new security event",
      to: "/incidents",
      icon: AlertTriangle,
      roles: ["Guard", "Admin", "Warden"],
    },
    {
      label: "Today's Assignments",
      desc: "View current labor & schedule",
      to: "/schedules",
      icon: Activity,
      roles: ["Guard", "Admin", "Warden", "Viewer"],
    },
  ];

  const visibleActions = allActions.filter(
    (a) => a.roles.includes(role) || role === "Admin"
  );

  const isWardenOrAdmin = ["Warden", "Admin"].includes(role);
  const isGuard = role === "Guard";

  // Format short date for incidents
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
      {/* Small context header for the console */}
      <div className="ops-header">
        <div>
          <div className="eyebrow">Facility Operations</div>
          <h2>Real-time Overview</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Live snapshot of staffing, population, capacity, and critical alerts.
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

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}. Some data may be stale.</span>
        </div>
      )}

      {/* OVERVIEW CARDS */}
      <section>
        <div className="section-head" style={{ marginBottom: 12 }}>
          <div>
            <span className="eyebrow">Key Indicators</span>
          </div>
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
            {OVERVIEW_CARDS.map((card) => {
              const Icon = card.icon;
              const value = stats[card.key] ?? 0;
              return (
                <div key={card.key} className="metric-card">
                  <div
                    className="metric-icon"
                    style={{ background: card.accent + "15", color: card.accent }}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="metric-title">{card.title}</div>
                    <div className="metric-value">{value}</div>
                    <div className="metric-sub">{card.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="split-grid" style={{ alignItems: "start" }}>
        {/* QUICK ACTIONS */}
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Quick Actions</span>
              <h3 style={{ marginTop: 2 }}>What do you need to do?</h3>
            </div>
          </div>

          {visibleActions.length > 0 ? (
            <div className="quick-actions">
              {visibleActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link key={idx} to={action.to} className="quick-action">
                    <div className="icon-wrap">
                      <Icon size={20} />
                    </div>
                    <div className="qa-content">
                      <div className="qa-label">{action.label}</div>
                      <div className="qa-desc">{action.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted">No quick actions available for your role.</p>
          )}

          <div style={{ marginTop: 16, fontSize: "0.8rem", color: "var(--muted)" }}>
            {isWardenOrAdmin && "Warden tools prioritized • "}
            {isGuard && "Guard tools prioritized • "}
            Actions open the relevant module with your permissions applied.
          </div>
        </section>

        {/* ALERTS + RECENT ACTIVITY */}
        <section className="panel alerts-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Operational Alerts</span>
              <h3 style={{ marginTop: 2 }}>Attention required</h3>
            </div>
            <Link to="/incidents" className="muted-link" style={{ fontSize: "0.85rem" }}>
              View all incidents →
            </Link>
          </div>

          {/* High occupancy warnings */}
          {highOccupancy.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#8a6f3a", marginBottom: 6 }}>
                NEAR CAPACITY
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
                    <div className="alert-meta">Action needed</div>
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

      {/* Footer note */}
      <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--muted)", marginTop: 8 }}>
        Data is fetched live from the prison backend. Use Refresh for the latest snapshot.
        {role === "Viewer" && " (Read-only access)"}
      </div>
    </div>
  );
}
