import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import Input from "../components/Input";
import "./Login.css";

const FEATURES = [
  "Multi-shop tenant management",
  "Real-time inventory tracking",
  "Cash & card checkout with receipts",
  "Sales analytics & CSV reports",
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    const dest = user.role === "cashier" ? "/pos" : "/admin";
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email, password);
      navigate(u.role === "cashier" ? "/pos" : "/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const demos = {
      admin: ["admin@pos.local", "Admin123!"],
      cashier: ["cashier1@pos.local", "Cashier123!"],
    };
    const [e, p] = demos[role];
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero-content">
          <span className="login-logo">POS</span>
          <h1>Shopping Center<br />Point of Sale</h1>
          <p>Modern retail operations for multi-tenant malls. Fast checkout, smart inventory, actionable insights.</p>
          <ul className="login-features">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@shop.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <Button type="submit" disabled={loading} className="login-submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="login-demo">
            <span>Quick demo:</span>
            <button type="button" className="demo-chip" onClick={() => fillDemo("admin")}>Admin</button>
            <button type="button" className="demo-chip" onClick={() => fillDemo("cashier")}>Cashier</button>
          </div>
        </div>
      </section>
    </div>
  );
}
