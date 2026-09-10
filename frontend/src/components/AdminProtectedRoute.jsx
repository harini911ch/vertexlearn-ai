import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  let user = null;

  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Failed to read user information:", error);
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminProtectedRoute;