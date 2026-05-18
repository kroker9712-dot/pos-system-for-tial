import { useEffect, useState } from "react";
import client from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/Toast";
import LowStockBanner from "../../components/LowStockBanner";

const LOW_STOCK_THRESHOLD = 5;

const emptyProduct = { name: "", sku: "", price: "", stock_qty: 0, category: "", shop_id: "" };

export default function Products() {
  const { user } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [shopFilter, setShopFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [error, setError] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const load = async () => {
    const params = {};
    if (user?.role === "admin" && shopFilter) params.shop_id = shopFilter;
    const { data } = await client.get("/products", { params });
    setProducts(data);
  };

  useEffect(() => {
    if (user?.role === "admin") {
      client.get("/shops").then(({ data }) => {
        setShops(data);
        if (!shopFilter && data.length) setShopFilter(String(data[0].id));
      });
    } else {
      setShopFilter(String(user?.shop_id || ""));
    }
  }, [user]);

  useEffect(() => {
    if (shopFilter || user?.role !== "admin") load();
  }, [shopFilter, user]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyProduct,
      shop_id: user?.role === "admin" ? shopFilter : String(user?.shop_id),
    });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      price: String(p.price),
      stock_qty: p.stock_qty,
      category: p.category || "",
      shop_id: String(p.shop_id),
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError("");
    const payload = {
      name: form.name,
      sku: form.sku,
      price: parseFloat(form.price),
      stock_qty: parseInt(form.stock_qty, 10),
      category: form.category || null,
      shop_id: parseInt(form.shop_id, 10),
    };
    try {
      if (editing) {
        await client.patch(`/products/${editing.id}`, payload);
      } else {
        await client.post("/products", payload);
      }
      setModalOpen(false);
      toast.success(editing ? "Product updated" : "Product created");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    await client.delete(`/products/${id}`);
    load();
  };

  const lowCount = products.filter((p) => p.stock_qty <= LOW_STOCK_THRESHOLD).length;
  const displayed = lowStockOnly
    ? products.filter((p) => p.stock_qty <= LOW_STOCK_THRESHOLD)
    : products;

  return (
    <>
      <LowStockBanner shopId={user?.role === "admin" ? shopFilter : undefined} />
      <PageHeader
        title="Products"
        subtitle="Manage catalog and inventory"
        actions={<Button onClick={openCreate}>Add Product</Button>}
      />
      <div className="toolbar">
        {user?.role === "admin" && (
          <select className="select-input" value={shopFilter} onChange={(e) => setShopFilter(e.target.value)}>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className={`chip ${lowStockOnly ? "active" : ""} ${lowCount > 0 ? "chip-warning" : ""}`}
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          ⚠ Low stock ({lowCount})
        </button>
      </div>
      <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((p) => (
            <tr key={p.id} className={p.stock_qty <= LOW_STOCK_THRESHOLD ? "row-low-stock" : ""}>
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td>${p.price.toFixed(2)}</td>
              <td>{p.stock_qty}</td>
              <td>{p.category || "—"}</td>
              <td>
                <Button variant="ghost" className="btn-sm" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                <Button variant="ghost" className="btn-sm" onClick={() => remove(p.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {modalOpen && (
        <Modal title={editing ? "Edit Product" : "New Product"} onClose={() => setModalOpen(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            {user?.role === "admin" && (
              <label className="field">
                <span className="field-label">Shop</span>
                <select
                  className="field-input"
                  value={form.shop_id}
                  onChange={(e) => setForm({ ...form, shop_id: e.target.value })}
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Stock" type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
