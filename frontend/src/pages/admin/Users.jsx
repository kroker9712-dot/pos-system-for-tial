import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/Toast";
import "./Users.css";

const emptyUser = { email: "", password: "", full_name: "", role: "cashier", shop_id: "", is_active: true };

export default function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const load = () => {
    client.get("/admin/users").then(({ data }) => setUsers(data));
    if (isAdmin) {
      client.get("/shops").then(({ data }) => setShops(data));
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const openEdit = (u) => {
    setEditing(u);
    setError("");
    setForm({
      email: u.email,
      password: "",
      full_name: u.full_name,
      role: u.role,
      shop_id: u.shop_id ? String(u.shop_id) : "",
      is_active: u.is_active,
    });
    setModalOpen(true);
  };

  const saveEdit = async () => {
    if (!form.full_name.trim()) {
      setError("Full name is required");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.role !== "admin" && isAdmin && !form.shop_id) {
      setError("Select a shop");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        role: form.role,
        shop_id: form.role === "admin" ? null : parseInt(form.shop_id, 10),
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;
      await client.patch(`/admin/users/${editing.id}`, payload);
      toast.success("User updated");
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this user? They will no longer be able to sign in.")) return;
    try {
      await client.delete(`/admin/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };

  const shopName = (id) => shops.find((s) => s.id === id)?.name || (id ? `Shop #${id}` : "—");

  return (
    <>
      <PageHeader
        title={isAdmin ? "Users" : "Team"}
        subtitle={
          isAdmin
            ? "Manage staff accounts across all shops"
            : "Cashiers and managers for your shop"
        }
        actions={
          <Link to="/admin/users/new">
            <Button>{currentUser?.role === "manager" ? "+ Add cashier" : "+ New user"}</Button>
          </Link>
        }
      />

      <div className="toolbar">
        <Input
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="users-search"
        />
        <span className="users-count">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              {isAdmin && <th>Shop</th>}
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
                  {search ? "No users match your search" : "No users yet — create your first team member"}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name}</strong>
                    {u.id === currentUser?.id && (
                      <span className="badge" style={{ marginLeft: "0.5rem" }}>You</span>
                    )}
                  </td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  {isAdmin && <td>{shopName(u.shop_id)}</td>}
                  <td>
                    {u.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <Button variant="ghost" className="btn-sm" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    {u.id !== currentUser?.id && (
                      <Button variant="ghost" className="btn-sm" onClick={() => remove(u.id)}>
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && editing && (
        <Modal title="Edit user" onClose={() => setModalOpen(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <Input label="Email" value={form.email} disabled />
            <Input
              label="New password (optional)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep current"
            />
            {isAdmin && (
              <label className="field">
                <span className="field-label">Role</span>
                <select
                  className="field-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                </select>
              </label>
            )}
            {form.role !== "admin" && isAdmin && (
              <label className="field">
                <span className="field-label">Shop</span>
                <select
                  className="field-input"
                  value={form.shop_id}
                  onChange={(e) => setForm({ ...form, shop_id: e.target.value })}
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span className="field-label">Active</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
            </label>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
