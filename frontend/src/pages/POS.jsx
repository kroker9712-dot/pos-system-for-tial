import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { getCategoryIcon, IconSearch } from "../components/Icons";
import Modal from "../components/Modal";
import LowStockBanner from "../components/LowStockBanner";
import { useToast } from "../components/Toast";
import "./POS.css";

export default function POS() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const searchRef = useRef(null);
  const skuRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [shopId, setShopId] = useState(user?.shop_id);
  const [shops, setShops] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  const shopParams = user?.role === "admin" ? { shop_id: shopId } : {};

  const loadProducts = useCallback(async () => {
    if (user?.role === "admin" && !shopId) return;
    setProductsLoading(true);
    try {
      const params = { ...shopParams, search: search || undefined, category: category || undefined };
      const { data } = await client.get("/products", { params });
      setProducts(data);
    } finally {
      setProductsLoading(false);
    }
  }, [search, category, shopId, user?.role]);

  const loadCategories = useCallback(async () => {
    if (user?.role === "admin" && !shopId) return;
    const { data } = await client.get("/products/categories", { params: shopParams });
    setCategories(data);
  }, [shopId, user?.role]);

  const loadRecent = useCallback(async () => {
    if (user?.role === "admin" && !shopId) return;
    const { data } = await client.get("/sales", { params: { ...shopParams } });
    setRecentSales(data.slice(0, 6));
  }, [shopId, user?.role]);

  useEffect(() => {
    if (user?.role === "admin") {
      client.get("/shops").then(({ data }) => {
        setShops(data);
        if (!shopId && data.length) setShopId(data[0].id);
      });
    } else {
      setShopId(user?.shop_id);
    }
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts();
      loadCategories();
    }, 250);
    return () => clearTimeout(t);
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const addToCart = (product) => {
    if (product.stock_qty <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) {
          toast.error("Max stock reached");
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          maxStock: product.stock_qty,
        },
      ];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i;
          const q = i.quantity + delta;
          return q <= 0 ? null : { ...i, quantity: Math.min(q, i.maxStock) };
        })
        .filter(Boolean)
    );
  };

  const handleSkuSubmit = async (e) => {
    e.preventDefault();
    const sku = skuInput.trim();
    if (!sku) return;
    try {
      const { data } = await client.get(`/products/by-sku/${encodeURIComponent(sku)}`, { params: shopParams });
      addToCart(data);
      setSkuInput("");
      skuRef.current?.focus();
    } catch {
      toast.error(`SKU "${sku}" not found`);
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const tendered = parseFloat(cashTendered) || 0;
  const changeDue = paymentMethod === "cash" && tendered >= subtotal ? tendered - subtotal : 0;

  const checkout = async () => {
    if (paymentMethod === "cash" && tendered > 0 && tendered < subtotal) {
      setError("Insufficient cash tendered");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await client.post("/sales", {
        shop_id: shopId,
        payment_method: paymentMethod,
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setReceipt({ ...data, change_due: changeDue });
      setCart([]);
      setCashTendered("");
      toast.success(`Sale #${data.id} completed — $${data.total.toFixed(2)}`);
      loadProducts();
      loadRecent();
    } catch (err) {
      const msg = err.response?.data?.error || "Checkout failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === "Enter" && cart.length > 0 && !loading) {
        e.preventDefault();
        checkout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart, loading, paymentMethod, cashTendered, shopId]);

  const printReceipt = () => window.print();

  return (
    <div className="pos-page">
      <header className="pos-header">
        <div className="pos-header-brand">
          <span className="pos-logo">POS</span>
          <div>
            <h1>Checkout</h1>
            <p>{user?.full_name} · <span className="role-badge">{user?.role}</span></p>
          </div>
        </div>
        <div className="pos-header-actions">
          {user?.role === "admin" && (
            <select className="select-input" value={shopId || ""} onChange={(e) => setShopId(Number(e.target.value))}>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <Button variant="secondary" onClick={() => setShowRecent(!showRecent)}>
            Recent
          </Button>
          {(user?.role === "admin" || user?.role === "manager") && (
            <>
              <LowStockBanner compact shopId={shopId} />
              <Button variant="secondary" onClick={() => navigate("/admin")}>Admin</Button>
            </>
          )}
          <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
        </div>
      </header>

      <div className="pos-layout">
        <main className="pos-main">
          <div className="pos-toolbar">
            <div className="search-wrap">
              <IconSearch className="search-icon" />
              <input
                ref={searchRef}
                className="pos-search"
                placeholder="Search name or SKU… (F2)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <form className="sku-scan" onSubmit={handleSkuSubmit}>
              <input
                ref={skuRef}
                className="field-input"
                placeholder="Scan / enter SKU"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
              />
              <Button type="submit" variant="secondary">Add</Button>
            </form>
          </div>

          {categories.length > 0 && (
            <div className="chip-group">
              <button type="button" className={`chip ${!category ? "active" : ""}`} onClick={() => setCategory("")}>
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${category === c ? "active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {productsLoading ? (
            <div className="product-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState icon="🔍" title="No products found" message="Try another search or category" />
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`product-card ${p.stock_qty <= 0 ? "out-of-stock" : ""}`}
                  disabled={p.stock_qty <= 0}
                  onClick={() => addToCart(p)}
                >
                  <span className="product-emoji">{getCategoryIcon(p.category)}</span>
                  <span className="product-name">{p.name}</span>
                  <span className="product-sku">{p.sku}</span>
                  <span className="product-price">${p.price.toFixed(2)}</span>
                  <span className={`product-stock ${p.stock_qty <= 5 ? "low" : ""}`}>
                    {p.stock_qty <= 0 ? "Out of stock" : `${p.stock_qty} in stock`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className={`pos-cart-panel ${showRecent ? "with-recent" : ""}`}>
          {showRecent && (
            <div className="recent-panel">
              <h3>Recent sales</h3>
              <ul className="recent-list">
                {recentSales.map((s) => (
                  <li key={s.id}>
                    <span>#{s.id}</span>
                    <span>${s.total.toFixed(2)}</span>
                    <span className="recent-time">{new Date(s.created_at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pos-cart">
            <div className="cart-header">
              <h2>Cart</h2>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              {cart.length > 0 && (
                <button type="button" className="cart-clear" onClick={() => setCart([])}>Clear</button>
              )}
            </div>

            {cart.length === 0 ? (
              <EmptyState icon="🛒" title="Cart is empty" message="Tap a product or scan a SKU" />
            ) : (
              <ul className="cart-items">
                {cart.map((item) => (
                  <li key={item.product_id} className="cart-item">
                    <div className="cart-item-top">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="cart-item-qty">
                      <button type="button" aria-label="Decrease" onClick={() => updateQty(item.product_id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Increase" onClick={() => updateQty(item.product_id, 1)}>+</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="payment-tabs">
              <button
                type="button"
                className={`payment-tab ${paymentMethod === "cash" ? "active" : ""}`}
                onClick={() => setPaymentMethod("cash")}
              >
                Cash
              </button>
              <button
                type="button"
                className={`payment-tab ${paymentMethod === "card" ? "active" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                Card
              </button>
            </div>

            {paymentMethod === "cash" && cart.length > 0 && (
              <div className="cash-panel">
                <label className="field">
                  <span className="field-label">Cash tendered</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="field-input"
                    placeholder="0.00"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                  />
                </label>
                {tendered > 0 && (
                  <p className={`change-due ${changeDue < 0 ? "insufficient" : ""}`}>
                    Change: <strong>${Math.max(changeDue, 0).toFixed(2)}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
            </div>

            <Button
              className="checkout-btn btn-lg"
              disabled={cart.length === 0 || loading}
              onClick={checkout}
            >
              {loading ? "Processing…" : `Complete Sale · $${subtotal.toFixed(2)}`}
            </Button>
            <p className="shortcut-hint">Ctrl+Enter to checkout</p>
          </div>
        </aside>
      </div>

      {receipt && (
        <Modal title="Receipt" onClose={() => setReceipt(null)} wide className="modal-receipt">
          <div className="receipt printable">
            <div className="receipt-header">
              <p className="receipt-shop">Shopping Center POS</p>
              <p className="receipt-id">Sale #{receipt.id}</p>
              <p className="receipt-date">{new Date(receipt.created_at).toLocaleString()}</p>
            </div>
            <table className="receipt-table">
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {receipt.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>${item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-footer">
              <p>Payment: <strong>{receipt.payment_method}</strong></p>
              {receipt.change_due > 0 && <p>Change: <strong>${receipt.change_due.toFixed(2)}</strong></p>}
              <p className="receipt-total">Total: <strong>${receipt.total.toFixed(2)}</strong></p>
            </div>
            <div className="receipt-actions no-print">
              <Button variant="secondary" onClick={printReceipt}>Print</Button>
              <Button onClick={() => setReceipt(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
