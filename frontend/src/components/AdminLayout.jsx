import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  IconBox,
  IconChart,
  IconDashboard,
  IconPos,
  IconStore,
  IconUsers,
} from "./Icons";
import Button from "./Button";
import LowStockBanner from "./LowStockBanner";
import "./AdminLayout.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: IconDashboard, roles: ["admin", "manager"] },
  { to: "/admin/products", label: "Products", icon: IconBox, roles: ["admin", "manager"] },
  { to: "/admin/shops", label: "Shops", icon: IconStore, roles: ["admin"] },
  { to: "/admin/users", label: "Users", icon: IconUsers, roles: ["admin", "manager"] },
  { to: "/admin/reports", label: "Reports", icon: IconChart, roles: ["admin", "manager"] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleNav = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-mark">POS</span>
          <span className="brand-sub">Shopping Center</span>
        </div>
        <LowStockBanner compact />
        <nav className="admin-nav">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                <Icon />
                {item.label}
              </NavLink>
            );
          })}
          <NavLink to="/pos" className="nav-link nav-pos">
            <IconPos />
            Open POS
          </NavLink>
        </nav>
        <div className="admin-user">
          <div className="user-avatar">{user?.full_name?.charAt(0) || "?"}</div>
          <div className="user-info">
            <p className="user-name">{user?.full_name}</p>
            <p className="user-role">{user?.role}</p>
          </div>
          <Button variant="secondary" className="sign-out-btn" onClick={() => { logout(); navigate("/login"); }}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
