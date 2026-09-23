import "./MetricCard.css";

export default function MetricCard({ icon, label, value, sub, color = "#2563eb" }) {
  return (
    <div className="metric-card" style={{ "--accent": color }}>
      <div className="metric-icon-wrap">
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-body">
        <span className="metric-value">{value}</span>
        <span className="metric-label">{label}</span>
        {sub && <span className="metric-sub">{sub}</span>}
      </div>
      <div className="metric-glow" />
    </div>
  );
}
