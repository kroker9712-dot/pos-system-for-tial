import { useEffect, useState } from "react";
import client from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../components/Toast";

export default function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const [sales, setSales] = useState([]);
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (user?.role === "admin" && shopId) params.shop_id = shopId;
    const { data } = await client.get("/sales", { params });
    setSales(data);
  };

  useEffect(() => {
    if (user?.role === "admin") {
      client.get("/shops").then(({ data }) => setShops(data));
    }
    load();
  }, []);

  const exportCsv = () => {
    const headers = ["ID", "Date", "Total", "Payment", "Shop ID"];
    const rows = sales.map((s) => [
      s.id,
      s.created_at,
      s.total,
      s.payment_method,
      s.shop_id,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);

  return (
    <div>
      <PageHeader title="Sales Reports" subtitle="Filter and export transaction history" />
      <div className="toolbar">
        <input type="date" className="field-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" className="field-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {user?.role === "admin" && (
          <select className="field-input" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">All shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <Button onClick={load}>Apply</Button>
        <Button variant="secondary" onClick={exportCsv} disabled={!sales.length}>
          Export CSV
        </Button>
      </div>
      <p style={{ marginBottom: "1rem", color: "var(--color-text-muted)" }}>
        {sales.length} transactions · Total ${totalRevenue.toFixed(2)}
      </p>
      <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            {user?.role === "admin" && <th>Shop</th>}
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>#{s.id}</td>
              <td>{new Date(s.created_at).toLocaleString()}</td>
              <td>${s.total.toFixed(2)}</td>
              <td>{s.payment_method}</td>
              {user?.role === "admin" && <td>{s.shop_id}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
