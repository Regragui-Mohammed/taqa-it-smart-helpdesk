import "./StatusBadge.css";

const CONFIG = {
  // English
  "In Progress": { className: "status-in-progress", icon: "⏳", label: "In Progress" },
  "Resolved": { className: "status-resolved", icon: "✅", label: "Resolved" },
  "New": { className: "status-new", icon: "🆕", label: "New" },
  "Critical": { className: "status-critical", icon: "🔴", label: "Critical" },
  "High": { className: "status-high", icon: "🟠", label: "High" },
  "Normal": { className: "status-normal", icon: "🔵", label: "Normal" },
  "Medium": { className: "status-normal", icon: "🔵", label: "Medium" },
  "Low": { className: "status-low", icon: "🟢", label: "Low" },

  // French aliases mapped to English labels
  "En cours": { className: "status-in-progress", icon: "⏳", label: "In Progress" },
  "Traité": { className: "status-resolved", icon: "✅", label: "Resolved" },
  "Nouveau": { className: "status-new", icon: "🆕", label: "New" },
  "Critique": { className: "status-critical", icon: "🔴", label: "Critical" },
  "Haute": { className: "status-high", icon: "🟠", label: "High" },
  "Normale": { className: "status-normal", icon: "🔵", label: "Normal" },
  "Basse": { className: "status-low", icon: "🟢", label: "Low" },
};

export default function StatusBadge({ value }) {
  const cfg = CONFIG[value] || { className: "status-default", icon: "●", label: value };
  return (
    <span className={`status-badge ${cfg.className}`}>
      <span className="status-dot" />
      {cfg.label || value}
    </span>
  );
}
