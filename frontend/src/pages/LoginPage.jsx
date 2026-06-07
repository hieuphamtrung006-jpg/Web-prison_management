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
          setLocalError("Password confirmation does not match");
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
      setLocalError(err?.response?.data?.detail || err?.message || "Login failed");
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
          <span className="terminal-status">[ SECURE LINK ACTIVE ]</span>
        </div>

        <div className="login-title-section">
          <h1>PRISON COMMAND</h1>
          <p className="terminal-subtitle">SYSTEM LOG: AUTHENTICATION REQUIRED</p>
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
            <span>SIGN IN</span>
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
            <span>CREATE KEY</span>
          </button>
        </div>

        <p className="auth-description">
          {mode === "signin"
            ? "Enter credentials to unlock operations and security modules."
            : "Register new operator key. Higher roles require Warden authorization."}
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          {mode === "signup" && (
            <div className="input-group">
              <label>Full name</label>
              <div className="input-wrapper">
                <User className="input-field-icon" size={16} />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User className="input-field-icon" size={16} />
              <input
                type="text"
                placeholder="Operator ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          {mode === "signup" && (
            <div className="input-group">
              <label>Role</label>
              <div className="input-wrapper">
                <Shield className="input-field-icon" size={16} />
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Viewer">Viewer (Read-only)</option>
                  <option value="Guard">Guard (Operator)</option>
                  <option value="Warden">Warden (Supervisor)</option>
                  <option value="Admin">Admin (Full access)</option>
                </select>
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Password</label>
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
                <label>Confirm password</label>
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
                    placeholder="operator@prison.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Phone</label>
                <div className="input-wrapper">
                  <Phone className="input-field-icon" size={16} />
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
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
              "REGISTER SECURITY KEY"
            ) : (
              "EXECUTE SIGN IN"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>AUTHORIZED SECURITY PERSONNEL ONLY</p>
          <p className="muted-code">IP_LOGGING: ON • AES_256: ACTIVE</p>
        </div>
      </div>
    </div>
  );
}
