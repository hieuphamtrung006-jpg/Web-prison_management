import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const fullNavItems = [
  { to: "/", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/prisoners", label: "Prisoners" },
  { to: "/locations", label: "Locations" },
  { to: "/incidents", label: "Incidents" },
  { to: "/visits", label: "Visits" },
  { to: "/labor", label: "Labor" },
  { to: "/schedules", label: "Schedules" },
  { to: "/shifts", label: "Shifts" },
];

const viewerNavItems = [
  { to: "/prisoners", label: "Prisoners" },
  { to: "/labor", label: "Labor" },
  { to: "/schedules", label: "Schedules" },
  { to: "/visits", label: "Visits" },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isGuard = user?.role === "Guard";
  const navItems = user?.role === "Viewer"
    ? viewerNavItems
    : isGuard
      ? fullNavItems.filter((item) => item.label !== "Dashboard")
      : fullNavItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">PC</span>
          Prison Command
        </Link>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-item nav-item-active" : "nav-item"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          <div className="user-chip">
            <span>{user?.full_name || "User"}</span>
            <span className="user-role">{user?.role || "Unknown"}</span>
          </div>
          <button className="primary-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Prison operations platform</p>
            <h1>Operations Console</h1>
            <p className="muted">
              Secure visibility into staffing, incidents, and schedules across your facility.
            </p>
          </div>
          <div className="header-actions">
            <span className="status-pill">Protected access</span>
          </div>
        </header>
        <section className="page-area">{children}</section>
      </main>
    </div>
  );
}
