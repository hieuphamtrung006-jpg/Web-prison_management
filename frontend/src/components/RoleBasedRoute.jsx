import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * RoleBasedRoute - Restricts access to specific user roles
 * @param {ReactNode} children - Component to render if authorized
 * @param {Array<string>} allowedRoles - Roles that can access this route
 * @param {ReactNode} fallback - Component to show if not authorized (default: navigate to /)
 */
export default function RoleBasedRoute({ children, allowedRoles = [], fallback = null }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-center">Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If fallback is provided, show it; otherwise redirect to home
    if (fallback) {
      return fallback;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
