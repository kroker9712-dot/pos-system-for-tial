import { useEffect, useState } from "react";
import client from "../../api/client";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", location: "", is_active: true });

  const load = () => client.get("/shops").then(({ data }) => setShops(data));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", location: "", is_active: true });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, location: s.location || "", is_active: s.is_active });
    setModalOpen(true);
  };

  const save = async () => {
    if (editing) {
      await client.patch(`/shops/${editing.id}`, form);
    } else {
      await client.post("/shops", form);
    }
    setModalOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this shop?")) return;
    await client.delete(`/shops/${id}`);
    load();
  };

  return (
    <>
      <PageHeader
        title="Shops"
        subtitle="Tenants in the shopping center"
        actions={<Button onClick={openCreate}>Add Shop</Button>}
      />
      <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shops.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.location || "—"}</td>
              <td>{s.is_active ? <span className="badge">Active</span> : <span className="badge badge-danger">Inactive</span>}</td>
              <td>
                <Button variant="ghost" className="btn-sm" onClick={() => openEdit(s)}>Edit</Button>
                <Button variant="ghost" className="btn-sm" onClick={() => remove(s.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {modalOpen && (
        <Modal title={editing ? "Edit Shop" : "New Shop"} onClose={() => setModalOpen(false)}>
          <div className="form-row">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <label className="field">
              <span className="field-label">Active</span>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            </label>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
