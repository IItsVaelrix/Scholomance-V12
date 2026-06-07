import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { isAdminUser } from "../lib/admin.js";

const IS_PROD = typeof import.meta !== "undefined" && import.meta.env.PROD === true;

/**
 * AdminRoute Guard
 * Only allows access to internal modules in development, 
 * or to admins in production.
 */
export function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  const isInternalAdmin = isAdminUser(user);

  // In production, strictly gate by admin status
  if (IS_PROD && !isInternalAdmin) {
    return <Navigate to="/read" state={{ from: location }} replace />;
  }

  // In development, allow all access (or still gate by admin if preferred)
  return children;
}
