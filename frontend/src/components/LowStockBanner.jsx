import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "./LowStockBanner.css";

export default function LowStockBanner({ shopId, compact }) {
  const { user } = useAuth();
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const params = { threshold: 5 };
    if (user?.role === "admin" && shopId) params.shop_id = shopId;

    client
      .get("/admin/low-stock", { params })
      .then(({ data }) => setAlert(data))
      .catch(() => setAlert(null));
  }, [user, shopId]);

  if (!alert || alert.count === 0) return null;

  if (compact) {
    return (
      <Link to="/admin/products" className="low-stock-pill" title="View low stock products">
        <span className="pill-icon">⚠</span>
        {alert.count} low stock
      </Link>
    );
  }

  return (
    <div className="low-stock-banner">
      <div className="low-stock-banner-icon">⚠</div>
      <div className="low-stock-banner-body">
        <strong>Low stock warning</strong>
        <span>
          {alert.count} product{alert.count !== 1 ? "s" : ""} at or below {alert.threshold} units
          {alert.items?.length > 0 && (
            <> — e.g. {alert.items.slice(0, 3).map((p) => p.name).join(", ")}
            {alert.count > 3 ? "…" : ""}</>
          )}
        </span>
      </div>
      <Link to="/admin/products" className="low-stock-banner-link">
        Restock →
      </Link>
    </div>
  );
}
