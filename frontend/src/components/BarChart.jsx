import "./BarChart.css";

export default function BarChart({ data, valueKey = "revenue", labelKey = "date" }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  const formatLabel = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short" });
  };

  return (
    <div className="bar-chart">
      {data.map((item, i) => {
        const pct = (item[valueKey] / max) * 100;
        return (
          <div key={i} className="bar-chart-col">
            <div className="bar-chart-bar-wrap">
              <div
                className="bar-chart-bar"
                style={{ height: `${Math.max(pct, 4)}%` }}
                title={`$${item[valueKey].toFixed(2)}`}
              />
            </div>
            <span className="bar-chart-label">{formatLabel(item[labelKey])}</span>
            <span className="bar-chart-value">
              {valueKey === "revenue" ? `$${item[valueKey].toFixed(0)}` : item[valueKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
