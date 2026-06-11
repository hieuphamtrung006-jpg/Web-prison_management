import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Shield,
  MapPin,
  AlertTriangle,
  Calendar,
  Briefcase,
  ClipboardList,
  Clock,
  LogOut,
  Menu,
  X,
  User,
  ShieldCheck,
} from "lucide-react";

const fullNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/prisoners", label: "Prisoners", icon: Shield },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/visits", label: "Visits", icon: Calendar },
  { to: "/labor", label: "Labor", icon: Briefcase },
  { to: "/schedules", label: "Schedules", icon: ClipboardList },
  { to: "/shifts", label: "Shifts", icon: Clock },
];

const viewerNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/prisoners", label: "Prisoners", icon: Shield },
  { to: "/visits", label: "Visits", icon: Calendar },
  { to: "/labor", label: "Labor", icon: Briefcase },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isGuard = user?.role === "Guard";
  let navItems = user?.role === "Viewer"
    ? viewerNavItems
    : isGuard
      ? fullNavItems.filter((item) => item.label !== "Dashboard")
      : fullNavItems;

  // For Viewer, make the Visits menu label more specific ("My Visit Requests")
  if (user?.role === "Viewer") {
    navItems = navItems.map(item => 
      item.label === "Visits" 
        ? { ...item, label: "My Visit Requests" } 
        : item
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={20} />
        </button>
        <Link className="brand" to="/">
          <span className="brand-mark">PC</span>
          <span>Prison Command</span>
        </Link>
        <div className="system-status-indicator">
          <span className="status-dot green"></span>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Link className="brand" to="/" onClick={() => setSidebarOpen(false)}>
            <span className="brand-mark">PC</span>
            <span className="brand-text">Prison Command</span>
          </Link>
          <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="system-security-banner">
          <ShieldCheck size={16} />
          <span>Console: Secure</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  isActive ? "sidebar-item active" : "sidebar-item"
                }
              >
                <Icon size={18} className="sidebar-icon" />
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-meta">
              <span className="username">{user?.full_name || "Operator"}</span>
              <span className="user-role">{user?.role || "Warden"}</span>
            </div>
          </div>
          <button className="signout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Workspace */}
      <div className="main-layout">
        <header className="top-workspace-header">
          <div className="breadcrumb">
            <span className="eyebrow">Prison Operations Command Center</span>
          </div>
          <div className="system-vital-badges">
            <div className="vital-badge">
              <span className="vital-dot pulsing-green"></span>
              <span>NETWORK: ONLINE</span>
            </div>
            <div className="vital-badge danger">
              <span className="vital-dot red"></span>
              <span>ALERTS: ACTIVE</span>
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="workspace-area">{children}</div>
        </main>
      </div>
    </div>
  );
}
