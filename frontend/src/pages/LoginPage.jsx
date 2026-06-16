import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  LogIn,
  UserPlus,
  Shield,
  Fingerprint,
} from "lucide-react";

export default function LoginPage() {
  const { user, login, signup, error } = useAuth();
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("admin_master");
  const [password, setPassword] = useState("123456");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Viewer");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLocalError("");
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setLocalError("Xác nhận mật khẩu không khớp");
          return;
        }
        await signup({
          username,
          password,
          full_name: fullName,
          role,
          email: email || null,
          phone: phone || null,
        });
      } else {
        await login(username, password);
      }
    } catch (err) {
      setLocalError(err?.response?.data?.detail || err?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-badge-header">
          <div className="cyber-seal">
            <Fingerprint className="pulse-cyan" size={32} />
          </div>
          <span className="terminal-status">[ LIÊN KẾT AN TOÀN ĐANG HOẠT ĐỘNG ]</span>
        </div>

        <div className="login-title-section">
          <h1>CHỈ HUY NHÀ TÙ</h1>
          <p className="terminal-subtitle">NHẬT KÝ HỆ THỐNG: YÊU CẦU XÁC THỰC</p>
        </div>

        <div className="auth-switch-row">
          <button
            type="button"
            className={mode === "signin" ? "auth-switch-btn active" : "auth-switch-btn"}
            onClick={() => {
              setMode("signin");
              setLocalError("");
            }}
          >
            <LogIn size={14} />
            <span>ĐĂNG NHẬP</span>
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-switch-btn active" : "auth-switch-btn"}
            onClick={() => {
              setMode("signup");
              setLocalError("");
            }}
          >
            <UserPlus size={14} />
            <span>TẠO KHÓA</span>
          </button>
        </div>

        <p className="auth-description">
          {mode === "signin"
            ? "Nhập thông tin đăng nhập để mở khóa các mô-đun vận hành và an ninh."
            : "Đăng ký khóa vận hành mới. Vai trò cao hơn cần ủy quyền của Giám thị trưởng."}
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          {mode === "signup" && (
            <div className="input-group">
              <label>Họ và tên</label>
              <div className="input-wrapper">
                <User className="input-field-icon" size={16} />
                <input
                  type="text"
                  placeholder="ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Tên đăng nhập</label>
            <div className="input-wrapper">
              <User className="input-field-icon" size={16} />
              <input
                type="text"
                placeholder="Mã người dùng"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          {mode === "signup" && (
            <div className="input-group">
              <label>Vai trò</label>
              <div className="input-wrapper">
                <Shield className="input-field-icon" size={16} />
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Viewer">Người xem (Chỉ đọc)</option>
                  <option value="Guard">Giám thị (Vận hành)</option>
                  <option value="Warden">Giám thị trưởng (Giám sát)</option>
                  <option value="Admin">Quản trị viên (Toàn quyền)</option>
                </select>
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Mật khẩu</label>
            <div className="input-wrapper">
              <Lock className="input-field-icon" size={16} />
              <input
                type="password"
                placeholder="🔑••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {mode === "signup" && (
            <>
              <div className="input-group">
                <label>Xác nhận mật khẩu</label>
                <div className="input-wrapper">
                  <Lock className="input-field-icon" size={16} />
                  <input
                    type="password"
                    placeholder="🔑••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <Mail className="input-field-icon" size={16} />
                  <input
                    type="email"
                    placeholder="quanly@nhatu.gov.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Điện thoại</label>
                <div className="input-wrapper">
                  <Phone className="input-field-icon" size={16} />
                  <input
                    type="text"
                    placeholder="+84 123 456 789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {(localError || error) && (
            <div className="login-error-box">
              <ShieldAlert size={16} />
              <span>{localError || error}</span>
            </div>
          )}

          <button className="primary-btn submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner-small"></span>
            ) : mode === "signup" ? (
              "ĐĂNG KÝ KHÓA BẢO MẬT"
            ) : (
              "THỰC HIỆN ĐĂNG NHẬP"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>CHỈ DÀNH CHO NHÂN VIÊN AN NINH ĐƯỢC ỦY QUYỀN</p>
          <p className="muted-code">GHI LOG IP: BẬT • AES_256: HOẠT ĐỘNG</p>
        </div>
      </div>
    </div>
  );
}
