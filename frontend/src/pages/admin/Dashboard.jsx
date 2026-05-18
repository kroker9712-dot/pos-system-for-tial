import { useEffect, useState } from "react";
import client from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import BarChart from "../../components/BarChart";
import { IconDollar, IconReceipt } from "../../components/Icons";
import LowStockBanner from "../../components/LowStockBanner";
import PageHeader from "../../components/PageHeader";
import "./Dashboard.css";

function pctChange(today, yesterday) {
  if (!yesterday) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "admin") {
      client.get("/shops").then(({ data }) => setShops(data));
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = shopId ? { shop_id: shopId } : {};
    client
      .get("/admin/dashboard", { params })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [shopId]);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Loading analytics…" />
        <div className="card-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card skeleton" style={{ height: 120 }} />
          ))}
        </div>
      </div>
    );
  }

  const revChange = pctChange(data.today_revenue, data.yesterday_revenue);
  const salesChange = pctChange(data.today_sales_count, data.yesterday_sales_count);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Today's performance at a glance"
        actions={
          user?.role === "admin" && (
            <select className="select-input" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )
        }
      />

      <LowStockBanner shopId={shopId || undefined} />

      <div className="card-grid">
        <div className="stat-card stat-gradient-blue stat-accent" style={{ animationDelay: "0ms" }}>
          <div className="stat-card-icon"><IconDollar /></div>
          <h3>Revenue today</h3>
          <div className="value">${data.today_revenue.toFixed(2)}</div>
          <p className={`stat-trend ${revChange >= 0 ? "up" : "down"}`}>
            {revChange >= 0 ? "↑" : "↓"} {Math.abs(revChange)}% vs yesterday
          </p>
        </div>
        <div className="stat-card" style={{ animationDelay: "50ms" }}>
          <div className="stat-card-icon"><IconReceipt /></div>
          <h3>Transactions</h3>
          <div className="value">{data.today_sales_count}</div>
          <p className={`stat-trend ${salesChange >= 0 ? "up" : "down"}`}>
            {salesChange >= 0 ? "↑" : "↓"} {Math.abs(salesChange)}% vs yesterday
          </p>
        </div>
        <div className="stat-card" style={{ animationDelay: "100ms" }}>
          <h3>Avg order value</h3>
          <div className="value">${data.avg_order_value.toFixed(2)}</div>
          <p className="stat-trend">Per transaction today</p>
        </div>
        <div className={`stat-card stat-gradient-warning stat-accent ${data.low_stock.length > 0 ? "has-warning" : ""}`} style={{ animationDelay: "150ms" }}>
          <div className="stat-card-icon icon-warning">⚠</div>
          <h3>Low stock items</h3>
          <div className="value">{data.low_stock.length}</div>
          <p className="stat-trend">{data.low_stock.length > 0 ? "Restock needed" : "All stocked"}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h3 className="panel-title">7-day revenue</h3>
          <BarChart data={data.sales_chart} valueKey="revenue" labelKey="date" />
        </div>
        <div className="panel">
          <h3 className="panel-title">Payment methods today</h3>
          {data.payment_breakdown?.length === 0 ? (
            <p className="text-muted">No sales yet today</p>
          ) : (
            <ul className="payment-list">
              {data.payment_breakdown.map((p) => (
                <li key={p.method}>
                  <span className="payment-method">{p.method}</span>
                  <span>{p.count} sales</span>
                  <strong>${p.total.toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h3 className="panel-title">Top products today</h3>
          {data.top_products?.length === 0 ? (
            <p className="text-muted">No sales yet</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Product</th><th>Qty sold</th></tr>
                </thead>
                <tbody>
                  {data.top_products.map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td><span className="badge">{p.qty_sold}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="panel">
          <h3 className="panel-title">Low stock alert</h3>
          {data.low_stock.length === 0 ? (
            <p className="text-muted">All products well stocked</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Product</th><th>SKU</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {data.low_stock.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.sku}</td>
                      <td><span className="badge badge-danger">{p.stock_qty}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {data.recent_sales?.length > 0 && (
        <div className="panel" style={{ marginTop: "1.25rem" }}>
          <h3 className="panel-title">Recent transactions</h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Time</th><th>Total</th><th>Payment</th></tr>
              </thead>
              <tbody>
                {data.recent_sales.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td><strong>${s.total.toFixed(2)}</strong></td>
                    <td><span className="badge">{s.payment_method}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
