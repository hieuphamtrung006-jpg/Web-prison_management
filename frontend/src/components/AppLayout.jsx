import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
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

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
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
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>Operations Console</h1>
            <p>
              Signed in as <strong>{user?.full_name}</strong> ({user?.role})
            </p>
          </div>
          <button className="danger-btn" onClick={handleLogout}>
            Sign out
          </button>
        </header>
        <section className="page-area">{children}</section>
      </main>
    </div>
  );
}
