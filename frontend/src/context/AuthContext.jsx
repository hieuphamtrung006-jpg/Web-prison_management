import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const login = async (username, password) => {
    setError("");
    const response = await api.post("/auth/login", { username, password });
    const token = response.data.access_token;
    localStorage.setItem("accessToken", token);
    await loadProfile();
  };

  const signup = async (payload) => {
    setError("");
    const response = await api.post("/auth/signup", payload);
    const token = response.data.access_token;
    if (token) {
      localStorage.setItem("accessToken", token);
      await loadProfile();
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  const loadProfile = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      return response.data;
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      localStorage.removeItem("accessToken");
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const boot = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await loadProfile();
      }
      setLoading(false);
    };
    boot();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      signup,
      logout,
      refreshUser: loadProfile,
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
