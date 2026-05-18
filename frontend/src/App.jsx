import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import POS from "./pages/POS";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Shops from "./pages/admin/Shops";
import Users from "./pages/admin/Users";
import NewUser from "./pages/admin/NewUser";
import Reports from "./pages/admin/Reports";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "cashier" ? "/pos" : "/admin"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/pos"
        element={
          <ProtectedRoute roles={["admin", "manager", "cashier"]}>
            <POS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin", "manager"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route
          path="shops"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Shops />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={["admin", "manager"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="users/new"
          element={
            <ProtectedRoute roles={["admin", "manager"]}>
              <NewUser />
            </ProtectedRoute>
          }
        />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
