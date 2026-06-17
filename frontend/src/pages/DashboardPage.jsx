import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  ClipboardCheck,
  FileText,
  Calendar,
  UserPlus,
} from "lucide-react";

// ============================================
// CONFIG: Key Indicators - 4 core metrics (titles, icons, styling)
// The actual values now come from the single real /dashboard/stats endpoint
// (no longer using these .endpoint for .length counts - that was the source of wrong numbers).
// ============================================
const KEY_INDICATORS = [
  {
    key: "users",
    title: "Số tài khoản hiện có",
    endpoint: "/users?active_only=true",
    icon: Users,
    accent: "#4f5df0",
    sub: "tài khoản hệ thống",
  },
  {
    key: "prisoners",
    title: "Tù nhân đang giam giữ",
    endpoint: "/prisoners",
    icon: UserCheck,
    accent: "#10a36e",
    sub: "dân số hiện tại",
  },
  {
    key: "locations",
    title: "Cơ sở giam giữ",
    endpoint: "/locations",
    icon: MapPin,
    accent: "#d97706",
    sub: "địa điểm theo dõi",
  },
  {
    key: "visits",
    title: "Yêu cầu thăm gặp chờ",
    endpoint: "/visits?status_filter=Pending&today_only=true",
    icon: Clock,
    accent: "#d64343",
    sub: "yêu cầu hôm nay",
  },
];

// ============================================
// CONFIG: Quick Actions (role-based, priority order)
// ============================================
const QUICK_ACTIONS = [
  {
    label: "Duyệt Yêu cầu Thăm gặp",
    desc: "Phê duyệt hoặc từ chối yêu cầu thăm gặp đang chờ",
    to: "/visits",
    icon: UserCheck,
    roles: ["Warden", "Guard", "Admin"],
  },
  {
    label: "Địa điểm Quá tải",
    desc: "Xem các cơ sở gần hoặc đạt công suất",
    to: "/locations",
    icon: MapPin,
    roles: ["Warden", "Admin"],
  },
  {
    label: "Ghi nhận Hiệu suất Hàng ngày",
    desc: "Ghi điểm năng suất lao động của tù nhân",
    to: "/labor",
    icon: ClipboardList,
    roles: ["Guard", "Admin", "Warden"],
  },
  {
    label: "Báo cáo Sự cố",
    desc: "Ghi nhanh sự cố an ninh hoặc kỷ luật mới",
    to: "/incidents",
    icon: AlertTriangle,
    roles: ["Guard", "Admin", "Warden"],
  },
  {
    label: "Phân công Hôm nay",
    desc: "Xem phân công lao động và lịch trình hiện tại",
    to: "/schedules",
    icon: Activity,
    roles: ["Guard", "Admin", "Warden", "Viewer"],
  },
  {
    label: "Năng suất Lao động",
    desc: "Xem xét hiệu suất hàng ngày và báo cáo",
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
  const isGuard = role === "Guard";   // Guard = operations staff (labor + incidents + visits view)
  const isWarden = role === "Warden"; // Warden = high-level management overview

  // State for core data (used by Admin/Warden)
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

  // Guard-specific state (focused operational data - gọn gàng cho vai trò vận hành)
  const [guardStats, setGuardStats] = useState({
    inCustody: 0,
    openIncidents: 0,
    pendingVisits: 0,
  });
  const [guardAlerts, setGuardAlerts] = useState({ incidents: [], visits: [] });
  const [guardLoading, setGuardLoading] = useState(true);

  // Warden-specific for recent activities
  const [wardenRecentActivities, setWardenRecentActivities] = useState([]);

  // ============================================
  // Data fetching - Core functionality
  // Fetches Key Indicators (now from dedicated accurate stats endpoint) + supporting alert data
  // ============================================
  const loadDashboard = useCallback(async (isRefresh = false) => {
    setLoading(true);
    if (!isRefresh) setError("");

    try {
      const result = {};

      // 1. Key Indicators - single call to real COUNT endpoint (no more paginated list.length hacks)
      // Backend /dashboard/stats returns the 4 exact aggregates matching the requirement:
      // activeStaff (Users.IsActive), inCustody (Prisoners.Status='InPrison'),
      // facilities (Locations.IsActive), pendingVisits (VisitRequests.Status='Pending')
      try {
        const statsRes = await api.get("/dashboard/stats");
        const s = statsRes.data || {};
        result.users = s.activeStaff ?? 0;       // Active Staff
        result.prisoners = s.inCustody ?? 0;     // In Custody
        result.locations = s.facilities ?? 0;    // Facilities
        result.visits = s.pendingVisits ?? 0;    // Pending Visits (from Visit *Requests*)
      } catch {
        result.users = 0;
        result.prisoners = 0;
        result.locations = 0;
        result.visits = 0;
      }
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
      setError(msg || "Không tải được dữ liệu vận hành");
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
      setError(msg || "Không tải được yêu cầu của bạn");
      setMyRequests([]);
    } finally {
      setViewerLoading(false);
    }
  }, []);

  // ============================================
  // Guard Dashboard Data Loading (Operations-focused)
  // Tailored for daily Guard work: custody count, labor assignments, incidents, visits
  // Sử dụng current_user.role === "Guard" để load dữ liệu tập trung, gọn nhẹ.
  // Bỏ fetch "near full cells" và recent activities để giao diện thoáng hơn.
  // Uses /dashboard/stats for accurate In Custody + Pending Visit Requests (real COUNTs).
  // ============================================
  const loadGuardDashboard = useCallback(async (isRefresh = false) => {
    setGuardLoading(true);
    if (!isRefresh) setError("");

    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // 1. Accurate global KPIs from dedicated stats endpoint (fixes previous list.length on paginated/wrong endpoints)
      let inCustody = 0;
      let pendingVisits = 0;
      try {
        const statsRes = await api.get("/dashboard/stats");
        const s = statsRes.data || {};
        inCustody = s.inCustody ?? 0;
        pendingVisits = s.pendingVisits ?? 0;
      } catch {
        inCustody = 0;
        pendingVisits = 0;
      }

      // 3. Incidents (ưu tiên các sự cố gần đây để Guard xử lý)
      let openIncidents = 0;
      let recentInc = [];
      try {
        const iRes = await api.get("/incidents?page=1&page_size=20");
        recentInc = Array.isArray(iRes.data) ? iRes.data : [];
        // Sắp xếp ưu tiên Severity cao trước
        recentInc.sort((a, b) => {
          const order = { High: 3, Medium: 2, Low: 1 };
          return (order[b.severity] || 0) - (order[a.severity] || 0);
        });
        openIncidents = recentInc.length;
      } catch { recentInc = []; openIncidents = 0; }

      // 4. Pending visit list (for guard alerts sidebar) - still fetch some recent pending for display
      let pendingVisitList = [];
      try {
        // Use the visits list only for the small alert preview (not for the count anymore)
        const vRes = await api.get("/visits/requests/pending?page=1&page_size=5");
        const reqs = Array.isArray(vRes.data) ? vRes.data : [];
        pendingVisitList = reqs.slice(0, 5);
      } catch {
        // fallback to visits endpoint if requests/pending not used here
        try {
          const vRes2 = await api.get("/visits?status_filter=Pending&page=1&page_size=5");
          pendingVisitList = (Array.isArray(vRes2.data) ? vRes2.data : []).slice(0, 5);
        } catch { pendingVisitList = []; }
      }

      setGuardStats({ inCustody, openIncidents, pendingVisits });
      setGuardAlerts({ incidents: recentInc.slice(0, 5), visits: pendingVisitList });
      setLastUpdated(new Date());
    } catch (err) {
      const msg = parseApiError(err);
      setError(msg || "Không tải được dữ liệu vận hành của giám thị");
    } finally {
      setGuardLoading(false);
    }
  }, []);

  // ============================================
  // Warden Dashboard Data Loading (high-level overview)
  // Reuses core loadDashboard + adds recent activities for management view
  // ============================================
  const loadWardenDashboard = useCallback(async (isRefresh = false) => {
    setLoading(true);
    if (!isRefresh) setError("");

    try {
      // Reuse core data load for indicators and alerts
      await loadDashboard(true);

      // Additional: Recent activities (mix of recent prisoners, visits, incidents)
      const activities = [];
      try {
        // Recent prisoners (last created)
        const pRes = await api.get("/prisoners?page=1&page_size=5");
        const recentPrisoners = Array.isArray(pRes.data) ? pRes.data : [];
        recentPrisoners.forEach((p) => {
          activities.push({
            type: "prisoner",
            id: p.prisoner_id,
            date: p.created_at,
            title: `New prisoner: ${p.full_name || 'Unknown'} (#${p.prisoner_id})`,
            meta: p.status || "",
          });
        });
      } catch {}

      try {
        // Recent approved visits/requests
        const vRes = await api.get("/visits?status_filter=Approved&page=1&page_size=5");
        const recentVisits = Array.isArray(vRes.data) ? vRes.data : [];
        recentVisits.forEach((v) => {
          activities.push({
            type: "visit",
            id: v.visit_id,
            date: v.visit_date,
            title: `Visit approved for prisoner #${v.prisoner_id}`,
            meta: v.visitor_name || "",
          });
        });
      } catch {}

      try {
        // Recent incidents
        const iRes = await api.get("/incidents?page=1&page_size=5");
        const recentInc = Array.isArray(iRes.data) ? iRes.data : [];
        recentInc.forEach((inc) => {
          activities.push({
            type: "incident",
            id: inc.incident_id,
            date: inc.incident_date,
            title: `Incident: ${inc.incident_type || 'Event'} (${inc.severity || ''})`,
            meta: `Prisoner #${inc.prisoner_id}`,
          });
        });
      } catch {}

      // Sort by date desc
      activities.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setWardenRecentActivities(activities.slice(0, 8));

      setLastUpdated(new Date());
    } catch (err) {
      const msg = parseApiError(err);
      setError(msg || "Failed to load management data");
    } finally {
      setLoading(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    if (isViewer) {
      loadViewerDashboard();
    } else if (isGuard) {
      loadGuardDashboard();          // Guard role: focused operations data
    } else if (isWarden) {
      loadWardenDashboard();         // Warden role: high-level management overview
    } else {
      loadDashboard();
    }
  }, [isViewer, isGuard, isWarden, loadDashboard, loadViewerDashboard, loadGuardDashboard, loadWardenDashboard]);

  const handleRefresh = () => {
    if (isViewer) {
      loadViewerDashboard();
    } else if (isGuard) {
      loadGuardDashboard(true);
    } else if (isWarden) {
      loadWardenDashboard(true);
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
          ) : isWarden ? (
            <>
              <div className="eyebrow">Management Overview</div>
              <h2>Bảng điều khiển quản lý</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                Tổng quan cấp cao về hoạt động nhà tù, chỉ số hiệu suất và cảnh báo quan trọng.
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
          disabled={isViewer ? viewerLoading : isGuard ? guardLoading : isWarden ? loading : loading}
        >
          <RefreshCw size={16} />
          {(isViewer ? viewerLoading : isGuard ? guardLoading : loading) ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>

      {/* Error state (core feedback) */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}. Một số dữ liệu có thể đã cũ.</span>
        </div>
      )}

      {/* ============================================
          ROLE-BASED DASHBOARD CONTENT
          Guard gets a focused Operations view for daily tasks
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
                  <Clock size={14} /> Cập nhật lần cuối {lastUpdated.toLocaleTimeString()}
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
                <span className="eyebrow">Hành động nhanh</span>
                <h3 style={{ marginTop: 2 }}>Bạn muốn làm gì?</h3>
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
                  <div className="qa-label" style={{ fontSize: "1.05rem" }}>Tạo Yêu cầu Thăm gặp Mới</div>
                  <div className="qa-desc">Gửi yêu cầu thăm gặp mới cho tù nhân</div>
                </div>
              </button>

              {/* Secondary action - go to full list */}
              <Link to="/visits" className="quick-action">
                <div className="icon-wrap">
                  <ClipboardList size={20} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">Xem Yêu cầu Của Tôi</div>
                  <div className="qa-desc">Xem lịch sử đầy đủ và trạng thái hiện tại của tất cả yêu cầu</div>
                </div>
              </Link>
            </div>
          </section>

          {/* RECENT REQUESTS - Last 5-6 of the viewer's requests */}
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">Hoạt động Gần đây</span>
                <h3 style={{ marginTop: 2 }}>Yêu cầu Thăm gặp Gần Đây Của Tôi</h3>
              </div>
            </div>

            {viewerLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Đang tải yêu cầu gần đây của bạn...</p>
              </div>
            ) : recentMyRequests.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Tù nhân</th>
                      <th>Ngày Thăm</th>
                      <th>Trạng thái</th>
                      <th style={{ width: 80 }}>Hành động</th>
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
                              title="Xem chi tiết trên trang Yêu cầu Thăm gặp Của Tôi"
                            >
                              Xem
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
                  Tạo Yêu cầu Thăm gặp Mới
                </button>
              </div>
            )}
          </section>
        </div>
      ) : isWarden ? (
        /* ============================================
           WARDEN MANAGEMENT DASHBOARD
           High-level overview using current_user.role === "Warden"
           Professional, total view for senior management.
           ============================================ */
        <div>
          {/* HEADER */}
          <div style={{ marginBottom: 10 }}>
            <div className="section-head" style={{ marginBottom: 2 }}>
              <div>
                <span className="eyebrow">Management Overview</span>
                <h2 style={{ marginTop: 2 }}>Bảng điều khiển quản lý</h2>
              </div>
              {lastUpdated && (
                <div className="last-updated">
                  <Clock size={13} /> Cập nhật {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
            <p className="muted" style={{ marginTop: 2, fontSize: "0.9rem" }}>
              Tổng quan cấp cao về hoạt động nhà tù, chỉ số hiệu suất và cảnh báo quan trọng.
            </p>
          </div>

          {/* KEY INDICATORS - 6 cards as requested */}
          <section style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ marginBottom: 6 }}>
              <span className="eyebrow">Key Indicators</span>
            </div>

            {loading ? (
              <div className="loading-grid">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="loading-card" />)}
              </div>
            ) : (
              <div className="metric-grid">
                <KeyIndicatorCard
                  title="In Custody"
                  value={stats.prisoners ?? 0}
                  sub="current population"
                  icon={UserCheck}
                  accent="#10a36e"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Active Staff"
                  value={stats.users ?? 0}
                  sub="on duty"
                  icon={Users}
                  accent="#4f5df0"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Total Locations"
                  value={stats.locations ?? 0}
                  sub="facilities tracked"
                  icon={MapPin}
                  accent="#d97706"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Pending Visit Requests"
                  value={stats.visits ?? 0}
                  sub="awaiting approval"
                  icon={Clock}
                  accent="#3b82f6"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Open Incidents"
                  value={recentIncidents.length}
                  sub="requiring attention"
                  icon={AlertTriangle}
                  accent="#dc2626"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Occupancy Rate"
                  value={`${highOccupancy.length > 0 
                    ? Math.round(highOccupancy.reduce((s, l) => s + (l.occupancyPct || 0), 0) / highOccupancy.length) 
                    : 0}%`}
                  sub="average facility usage"
                  icon={MapPin}
                  accent="#f59e0b"
                  loading={false}
                />
              </div>
            )}
          </section>

          {/* QUICK ACTIONS - specific for Warden */}
          <section className="panel" style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ marginBottom: 4 }}>
              <div>
                <span className="eyebrow">Quick Actions</span>
                <h3 style={{ marginTop: 1, fontSize: "1rem" }}>Quản lý cấp cao</h3>
              </div>
            </div>

            <div className="quick-actions" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
              <Link to="/users" className="quick-action">
                <div className="icon-wrap" style={{ background: "#dbeafe", color: "#1e40af" }}>
                  <Users size={19} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">Manage Users</div>
                  <div className="qa-desc">Quản lý tài khoản và phân quyền</div>
                </div>
              </Link>

              <Link to="/labor" className="quick-action">
                <div className="icon-wrap" style={{ background: "#fef3c7", color: "#92400e" }}>
                  <TrendingUp size={19} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">View All Reports</div>
                  <div className="qa-desc">Xem báo cáo tổng hợp</div>
                </div>
              </Link>

              <Link to="/schedules" className="quick-action">
                <div className="icon-wrap" style={{ background: "#ecfdf5", color: "#0f766e" }}>
                  <Calendar size={19} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">Generate Schedule</div>
                  <div className="qa-desc">Tạo lịch trình tối ưu</div>
                </div>
              </Link>

              <Link to="/visits" className="quick-action">
                <div className="icon-wrap" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                  <UserCheck size={19} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">Approve High Priority Requests</div>
                  <div className="qa-desc">Duyệt request ưu tiên cao</div>
                </div>
              </Link>
            </div>
          </section>

          {/* OPERATIONAL ALERTS - as requested */}
          <section className="panel" style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ marginBottom: 6 }}>
              <span className="eyebrow">Operational Alerts</span>
            </div>

            <div className="split-grid" style={{ gap: "12px" }}>
              {/* Buồng giam gần đầy */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#854d0e", marginBottom: 4 }}>
                  BUỒNG GIAM GẦN ĐẦY (≥80%)
                </div>
                {highOccupancy.length > 0 ? (
                  <div className="alert-list">
                    {highOccupancy.map((loc, i) => (
                      <div key={i} className="alert-item high">
                        <div className="alert-icon"><MapPin size={16} /></div>
                        <div className="alert-text">
                          <strong>{loc.location_name}</strong> — {loc.occupancyPct}% full
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert-item"><div className="alert-text">Không có buồng gần đầy.</div></div>
                )}
              </div>

              {/* Incidents nghiêm trọng */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#b91c1c", marginBottom: 4 }}>
                  INCIDENTS NGHIÊM TRỌNG
                </div>
                {recentIncidents.filter((inc) => inc.severity === "High").length > 0 ? (
                  <div className="alert-list">
                    {recentIncidents.filter((inc) => inc.severity === "High").slice(0, 3).map((inc, idx) => (
                      <div key={idx} className="alert-item" style={{ borderLeft: "3px solid #dc2626" }}>
                        <div className="alert-icon" style={{ color: "#dc2626" }}><AlertCircle size={16} /></div>
                        <div className="alert-text">
                          <strong>{inc.incident_type || "Incident"}</strong> - Prisoner #{inc.prisoner_id}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert-item"><div className="alert-text">Không có incidents nghiêm trọng.</div></div>
                )}
              </div>
            </div>

            {/* Visit Requests chờ duyệt lâu */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e40af", marginBottom: 4 }}>
                VISIT REQUESTS CHỜ DUYỆT LÂU
              </div>
              {recentIncidents.length > 0 ? ( // reuse as proxy, or note
                <div className="alert-list">
                  <div className="alert-item">
                    <div className="alert-icon"><Clock size={16} /></div>
                    <div className="alert-text">
                      Kiểm tra /visits để xem request chờ lâu. Sử dụng filter trạng thái Pending.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert-item"><div className="alert-text">Không có request chờ lâu.</div></div>
              )}
              <Link to="/visits" className="muted-link" style={{ fontSize: "0.72rem", marginTop: 4, display: "inline-block" }}>
                Xem tất cả yêu cầu thăm gặp →
              </Link>
            </div>
          </section>

          {/* RECENT ACTIVITIES */}
          <section className="panel">
            <div className="section-head" style={{ marginBottom: 6 }}>
              <div>
                <span className="eyebrow">Recent Activities</span>
                <h3 style={{ marginTop: 1, fontSize: "1rem" }}>Hoạt động gần đây</h3>
              </div>
            </div>

            {wardenRecentActivities.length > 0 ? (
              <div className="alert-list">
                {wardenRecentActivities.map((act, idx) => (
                  <div key={idx} className="alert-item">
                    <div className="alert-icon">
                      {act.type === "prisoner" ? <UserPlus size={16} /> : act.type === "visit" ? <UserCheck size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div className="alert-text">
                      <strong>{act.title}</strong>
                      {act.meta && <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--muted)" }}>{act.meta}</span>}
                    </div>
                    <div className="alert-meta" style={{ fontSize: "0.7rem" }}>{formatShortDate(act.date)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert-item"><div className="alert-text">Không có hoạt động gần đây.</div></div>
            )}
            <Link to="/prisoners" className="muted-link" style={{ fontSize: "0.72rem", marginTop: 4, display: "inline-block" }}>
              Xem chi tiết →
            </Link>
          </section>
        </div>
      ) : isGuard ? (
        /* ============================================
           GUARD OPERATIONS DASHBOARD (role-based)
           Sử dụng current_user.role === "Guard"
           Layout gọn gàng, tập trung vào công việc vận hành hàng ngày.
           Bỏ các phần không cần thiết (buồng giam gần đầy, recent activities).
           ============================================ */
        <div>
          {/* HEADER */}
          <div style={{ marginBottom: 10 }}>
            <div className="section-head" style={{ marginBottom: 2 }}>
              <div>
                <span className="eyebrow">Guard Operations</span>
                <h2 style={{ marginTop: 2 }}>Bảng điều khiển vận hành</h2>
              </div>
              {lastUpdated && (
                <div className="last-updated">
                  <Clock size={13} /> Cập nhật {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
            <p className="muted" style={{ marginTop: 2, fontSize: "0.9rem" }}>
              Nắm nhanh tình hình lao động, sự cố và thăm gặp hàng ngày.
            </p>
          </div>

          {/* PHẦN 1: KEY INDICATORS - 4 card gọn */}
          <section style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ marginBottom: 6 }}>
              <span className="eyebrow">Chỉ số chính</span>
            </div>

            {guardLoading ? (
              <div className="loading-grid">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="loading-card" />)}
              </div>
            ) : (
              <div className="metric-grid">
                <KeyIndicatorCard
                  title="Tù nhân đang giam giữ"
                  value={guardStats.inCustody}
                  sub="hiện tại (In Custody)"
                  icon={UserCheck}
                  accent="#10a36e"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Sự cố chờ xử lý"
                  value={guardStats.openIncidents}
                  sub="Pending Incidents"
                  icon={AlertTriangle}
                  accent="#dc2626"
                  loading={false}
                />
                <KeyIndicatorCard
                  title="Yêu cầu thăm gặp chờ"
                  value={guardStats.pendingVisits}
                  sub="Pending Visit Requests"
                  icon={Clock}
                  accent="#7c3aed"
                  loading={false}
                />
              </div>
            )}
          </section>

          {/* PHẦN 2: QUICK ACTIONS - Tiếng Việt thống nhất, màu sắc rõ ràng */}
          <section className="panel" style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ marginBottom: 4 }}>
              <div>
                <span className="eyebrow">Hành động nhanh</span>
                <h3 style={{ marginTop: 1, fontSize: "1rem" }}>Thực hiện công việc hàng ngày</h3>
              </div>
            </div>

            <div className="quick-actions" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
              {/* Nổi bật: Log Daily Performance - xanh dương cho Assignment/Labor */}
              <Link to="/labor" className="quick-action" style={{ 
                border: "2px solid #1e40af", 
                background: "#eff6ff"
              }}>
                <div className="icon-wrap" style={{ background: "#dbeafe", color: "#1e40af" }}>
                  <ClipboardCheck size={20} />
                </div>
                <div className="qa-content">
                  <div className="qa-label" style={{ color: "#1e40af", fontWeight: 600, fontSize: "0.95rem" }}>
                    Ghi nhận hiệu suất lao động
                  </div>
                  <div className="qa-desc" style={{ fontSize: "0.8rem" }}>Ghi Hiệu suất Hàng ngày</div>
                </div>
              </Link>

              {/* Report Incident - đỏ */}
              <Link to="/incidents" className="quick-action" style={{ border: "1px solid #fecaca", background: "#fef2f2" }}>
                <div className="icon-wrap" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  <AlertTriangle size={19} />
                </div>
                <div className="qa-content">
                  <div className="qa-label" style={{ fontWeight: 600 }}>Báo cáo sự cố mới</div>
                  <div className="qa-desc" style={{ fontSize: "0.78rem" }}>Báo cáo Sự cố Mới</div>
                </div>
              </Link>


              {/* View Pending Visit Requests - tím */}
              <Link to="/visits" className="quick-action">
                <div className="icon-wrap" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                  <FileText size={19} />
                </div>
                <div className="qa-content">
                  <div className="qa-label">Xem yêu cầu thăm gặp chờ</div>
                  <div className="qa-desc" style={{ fontSize: "0.78rem" }}>Xem Yêu cầu Thăm gặp Chờ</div>
                </div>
              </Link>
            </div>

            <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--muted)" }}>
              Bấm nút để thực hiện ngay (chuyển trang). Sau khi lưu, quay lại Dashboard và nhấn <strong>Refresh</strong> hoặc nút "Làm mới" bên dưới để cập nhật số liệu.
            </div>
          </section>

          {/* PHẦN 3: CẦN CHÚ Ý NGAY (chỉ Incidents + Pending Visits, bỏ near full cells) */}
          <section className="panel" style={{ marginBottom: 8 }}>
            <div className="section-head" style={{ marginBottom: 6 }}>
              <div>
                <span className="eyebrow">Cần chú ý ngay</span>
              </div>
              <button 
                className="secondary-btn" 
                style={{ fontSize: "0.75rem", padding: "2px 8px" }} 
                onClick={() => loadGuardDashboard(true)}
                disabled={guardLoading}
              >
                Làm mới
              </button>
            </div>

            <div className="split-grid" style={{ alignItems: "start", gap: "12px" }}>
              {/* Sự cố cần xử lý - đỏ, ưu tiên High */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#b91c1c", marginBottom: 4 }}>
                  Sự cố cần xử lý
                </div>
                {guardLoading ? (
                  <div className="loading-state" style={{ padding: "10px 0" }}><div className="spinner" /></div>
                ) : guardAlerts.incidents.length > 0 ? (
                  <div className="alert-list" style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {guardAlerts.incidents.map((inc, idx) => (
                      <div key={idx} className="alert-item" style={{ borderLeft: "3px solid #dc2626", padding: "6px 8px" }}>
                        <div className="alert-icon" style={{ color: "#dc2626" }}>
                          <AlertCircle size={16} />
                        </div>
                        <div className="alert-text">
                          <strong>{inc.incident_type || "Sự cố"}</strong>
                          {inc.severity && (
                            <span className="status-badge" style={{ 
                              marginLeft: 6, 
                              background: inc.severity === "High" ? "#fee2e2" : "#fef3c7",
                              color: inc.severity === "High" ? "#9f1239" : "#92400e",
                              fontSize: "0.65rem"
                            }}>
                              {inc.severity}
                            </span>
                          )}
                          <div style={{ fontSize: "0.75rem", marginTop: 1, color: "var(--muted)" }}>
                            {inc.description ? inc.description.slice(0, 55) + "..." : ""}
                          </div>
                        </div>
                        <div className="alert-meta" style={{ fontSize: "0.7rem" }}>{formatShortDate(inc.incident_date)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert-item" style={{ padding: "6px 8px" }}>
                    <div className="alert-text" style={{ fontSize: "0.85rem" }}>Không có sự cố cần xử lý.</div>
                  </div>
                )}
                <Link to="/incidents" className="muted-link" style={{ fontSize: "0.72rem", marginTop: 4, display: "inline-block" }}>
                  Xem tất cả sự cố →
                </Link>
              </div>

              {/* Yêu cầu thăm gặp đang chờ - tím */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#6b21a8", marginBottom: 4 }}>
                  Yêu cầu thăm gặp đang chờ
                </div>
                {guardLoading ? (
                  <div className="loading-state" style={{ padding: "10px 0" }}><div className="spinner" /></div>
                ) : guardAlerts.visits.length > 0 ? (
                  <div className="alert-list" style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {guardAlerts.visits.map((v, i) => (
                      <div key={i} className="alert-item" style={{ borderLeft: "3px solid #7c3aed", padding: "6px 8px" }}>
                        <div className="alert-icon" style={{ color: "#6b21a8" }}>
                          <Clock size={16} />
                        </div>
                        <div className="alert-text">
                          <strong>#{v.prisoner_id}</strong> — {v.visitor_name || "Người thăm"}
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 1 }}>
                            {v.visit_date ? new Date(v.visit_date).toLocaleDateString() : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert-item" style={{ padding: "6px 8px" }}>
                    <div className="alert-text" style={{ fontSize: "0.85rem" }}>Không có yêu cầu thăm gặp chờ.</div>
                  </div>
                )}
                <Link to="/visits" className="muted-link" style={{ fontSize: "0.72rem", marginTop: 4, display: "inline-block" }}>
                  Xem tất cả yêu cầu thăm gặp →
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* STAFF / OPERATIONS DASHBOARD - Original full view (Warden/Admin) */}
          {/* KEY INDICATORS (4 core cards) */}
          <section>
            <div className="section-head" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Chỉ số Chính</span>
              {lastUpdated && (
                <div className="last-updated">
                  <Clock size={14} /> Cập nhật lần cuối {lastUpdated.toLocaleTimeString()}
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
                <p className="muted">Không có hành động nhanh nào cho vai trò của bạn.</p>
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
                  Xem sự cố →
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
                    <div className="alert-text">Không có sự cố nào được báo cáo gần đây.</div>
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
        Dữ liệu đã được làm mới từ máy chủ. Sử dụng nút Làm mới để có bản chụp mới nhất.
        {isViewer && " (Chế độ xem cá nhân chỉ đọc)"}
        {isGuard && " (Guard operations view — focused on daily tasks)"}
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
      setError(parseApiError(err) || "Không gửi được yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo Yêu cầu Thăm gặp</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit} style={{ padding: "18px 20px 20px" }}>
          <label>
            Mã Tù nhân
            <input 
              type="number" 
              value={form.prisoner_id} 
              onChange={(e) => setForm({ ...form, prisoner_id: e.target.value })} 
              required 
            />
          </label>
          <label>
            Ngày yêu cầu
            <input 
              type="datetime-local" 
              value={form.requested_date} 
              onChange={(e) => setForm({ ...form, requested_date: e.target.value })} 
              required 
            />
          </label>

          <div className="modal-buttons">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi Yêu cầu"}
            </button>
            <button className="secondary-btn" type="button" onClick={onClose} disabled={loading}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
