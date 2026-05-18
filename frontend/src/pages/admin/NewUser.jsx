import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/Toast";
import "./NewUser.css";

const emptyForm = {
  email: "",
  password: "",
  confirmPassword: "",
  full_name: "",
  role: "cashier",
  shop_id: "",
  is_active: true,
};

export default function NewUser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [shops, setShops] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  useEffect(() => {
    if (isAdmin) {
      client.get("/shops").then(({ data }) => {
        setShops(data);
        if (data.length) {
          setForm((f) => ({ ...f, shop_id: String(data[0].id) }));
        }
      });
    } else if (isManager && user?.shop_id) {
      setForm((f) => ({ ...f, shop_id: String(user.shop_id), role: "cashier" }));
    }
  }, [isAdmin, isManager, user?.shop_id]);

  const validate = () => {
    if (!form.full_name.trim()) return "Full name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (form.role !== "admin" && !form.shop_id) return "Select a shop for this user";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: isManager ? "cashier" : form.role,
        shop_id: form.role === "admin" ? null : parseInt(form.shop_id, 10),
        is_active: form.is_active,
      };
      await client.post("/admin/users", payload);
      toast.success(`Cashier ${payload.email} created successfully`);
      navigate("/admin/users");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to create user";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = isAdmin
    ? [
        { value: "cashier", label: "Cashier", desc: "POS checkout only" },
        { value: "manager", label: "Manager", desc: "Shop admin + POS" },
        { value: "admin", label: "Admin", desc: "Full system access" },
      ]
    : [];

  return (
    <div className="new-user-page">
      <PageHeader
        title={isManager ? "Add cashier" : "Create new user"}
        subtitle={
          isManager
            ? "Create a cashier account for your shop — they can use the POS immediately"
            : "Add a staff account with role and shop assignment"
        }
        actions={
          <Link to="/admin/users">
            <Button variant="secondary">Back to users</Button>
          </Link>
        }
      />

      <form className="new-user-form panel" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        {isManager && (
          <div className="manager-role-banner">
            <span className="manager-role-icon">👤</span>
            <div>
              <strong>Cashier account</strong>
              <p>Managers can add cashiers assigned to your shop. They will have access to the POS checkout screen only.</p>
            </div>
          </div>
        )}

        <section className="form-section">
          <h3>Account details</h3>
          <div className="form-grid">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Jane Smith"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@shop.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 characters"
              required
            />
            <Input
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Repeat password"
              required
            />
          </div>
        </section>

        {isAdmin && (
          <section className="form-section">
            <h3>Role & access</h3>
            <div className="role-cards">
              {roleOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`role-card ${form.role === opt.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={form.role === opt.value}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                  <span className="role-card-title">{opt.label}</span>
                  <span className="role-card-desc">{opt.desc}</span>
                </label>
              ))}
            </div>

            {form.role !== "admin" && (
              <label className="field" style={{ marginTop: "1rem" }}>
                <span className="field-label">Assigned shop</span>
                <select
                  className="field-input"
                  value={form.shop_id}
                  onChange={(e) => setForm({ ...form, shop_id: e.target.value })}
                  required
                >
                  <option value="">Select shop…</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.location ? ` — ${s.location}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        )}

        <label className="active-toggle">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <span>Account is active (can sign in immediately)</span>
        </label>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/users")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : isManager ? "Create cashier" : "Create user"}
          </Button>
        </div>
      </form>
    </div>
  );
}
