import { useAuth } from "../context/AuthContext";
import taqaLogoDark from "../assets/logo_taqa_dark.png";
import "./Navbar.css";

const TEAM_ICONS = {
  "Desktop Support": "💻",
  "Security Team": "🛡️",
  "Application Support": "⚙️",
  "Network Team": "🌐",
};

export default function Navbar() {
  const { user, logout } = useAuth();

  const icon =
    user.role === "support" ? TEAM_ICONS[user.team] || "🔧" : "👤";
  const subtitle =
    user.role === "support"
      ? `Support Workspace — ${user.team}`
      : "IT Services & Support Portal";

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <div className="navbar-logo-container" title="TAQA Morocco — IT Smart Helpdesk">
            <img src={taqaLogoDark} alt="TAQA Morocco Logo" className="navbar-brand-logo-img" />
          </div>
          <div className="navbar-brand-divider" />
          <div className="navbar-title-block">
            <h1 className="navbar-title">
              {icon}{" "}
              {user.role === "support"
                ? `Support — ${user.team}`
                : "Employee Portal"}
            </h1>
            <p className="navbar-subtitle">
              Welcome {user.name} | {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-live-status">
          <span className="live-status-dot" />
          <span>Systems Operational</span>
        </div>
        <div className="navbar-user-badge">
          <span className="navbar-avatar">{user.name?.[0]?.toUpperCase()}</span>
          <span className="navbar-username">{user.name}</span>
          <span className="navbar-role-pill">
            {user.role === "support" ? "IT Support" : "Employee"}
          </span>
        </div>
        <button className="navbar-logout" onClick={logout} title="Sign Out">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </nav>
  );
}
