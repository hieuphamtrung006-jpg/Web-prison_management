import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
        <h1>Prison Command Console</h1>
        <p>
          {mode === "signin"
            ? "Authenticate to access operations and scheduling modules."
            : "Create an account. Viewer can sign up directly, other roles require Admin token."}
        </p>
        <div className="auth-switch-row">
          <button
            type="button"
            className={mode === "signin" ? "primary-btn" : "secondary-btn"}
            onClick={() => {
              setMode("signin");
              setLocalError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "primary-btn" : "secondary-btn"}
            onClick={() => {
              setMode("signup");
              setLocalError("");
            }}
          >
            Sign up
          </button>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {mode === "signup" && (
            <label>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
          )}
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          {mode === "signup" && (
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Viewer</option>
                <option>Guard</option>
                <option>Warden</option>
                <option>Admin</option>
              </select>
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {mode === "signup" && (
            <>
              <label>
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </>
          )}
          {(localError || error) && <p className="error-msg">{localError || error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading
              ? mode === "signup"
                ? "Signing up..."
                : "Signing in..."
              : mode === "signup"
                ? "Sign up"
                : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
