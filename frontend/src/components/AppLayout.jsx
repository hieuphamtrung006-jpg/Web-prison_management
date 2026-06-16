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
  { to: "/", label: "Trang chủ", icon: LayoutDashboard },
  { to: "/users", label: "Người dùng", icon: Users },
  { to: "/prisoners", label: "Tù nhân", icon: Shield },
  { to: "/locations", label: "Địa điểm", icon: MapPin },
  { to: "/incidents", label: "Sự cố", icon: AlertTriangle },
  { to: "/visits", label: "Thăm gặp", icon: Calendar },
  { to: "/labor", label: "Lao động", icon: Briefcase },
  { to: "/schedules", label: "Lịch trình", icon: ClipboardList },
  { to: "/shifts", label: "Ca làm việc", icon: Clock },
];

// Viewer: limited personal view
const viewerNavItems = [
  { to: "/", label: "Trang chủ", icon: LayoutDashboard },
  { to: "/prisoners", label: "Tù nhân", icon: Shield },
  { to: "/visits", label: "Yêu cầu thăm gặp của tôi", icon: Calendar },
  { to: "/labor", label: "Lao động", icon: Briefcase },
];

// Guard: operational support roles 
// Allowed menus per requirement: Dashboard, Prisoners, Labor, Incidents, Visits, Schedules
// Hidden for Guard (using current_user.role): Users, Locations, Shifts and other high-level management pages.
const guardNavItems = [
  { to: "/", label: "Trang chủ", icon: LayoutDashboard },
  { to: "/prisoners", label: "Tù nhân", icon: Shield },
  { to: "/incidents", label: "Sự cố", icon: AlertTriangle },
  { to: "/visits", label: "Thăm gặp", icon: Calendar },
  { to: "/labor", label: "Lao động", icon: Briefcase },
  { to: "/schedules", label: "Lịch trình", icon: ClipboardList },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isGuard = user?.role === "Guard";
  let navItems = user?.role === "Viewer"
    ? viewerNavItems
    : isGuard
      ? guardNavItems
      : fullNavItems;

  // Role-based menu control using current_user.role
  // Guard: only operational menus (Trang chủ, Tù nhân, Sự cố, Thăm gặp, Lao động, Lịch trình).
  // Explicitly no Users (high-level), Locations, Shifts etc.

  // For Viewer, make the Visits menu label more specific ("Yêu cầu thăm gặp của tôi")
  if (user?.role === "Viewer") {
    navItems = navItems.map(item => 
      item.label === "Thăm gặp" 
        ? { ...item, label: "Yêu cầu thăm gặp của tôi" } 
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
          <span>Chỉ huy Nhà tù</span>
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
            <span className="brand-text">Chỉ huy Nhà tù</span>
          </Link>
          <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="system-security-banner">
          <ShieldCheck size={16} />
          <span>Hệ thống: An toàn</span>
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
              <span className="username">{user?.full_name || "Người dùng"}</span>
              <span className="user-role">{user?.role || "Giám thị trưởng"}</span>
            </div>
          </div>
          <button className="signout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Workspace */}
      <div className="main-layout">
        <header className="top-workspace-header">
          <div className="breadcrumb">
            <span className="eyebrow">Trung tâm Chỉ huy Hoạt động Nhà tù</span>
          </div>
          <div className="system-vital-badges">
            <div className="vital-badge">
              <span className="vital-dot pulsing-green"></span>
              <span>MẠNG: TRỰC TUYẾN</span>
            </div>
            <div className="vital-badge danger">
              <span className="vital-dot red"></span>
              <span>CẢNH BÁO: ĐANG HOẠT ĐỘNG</span>
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
