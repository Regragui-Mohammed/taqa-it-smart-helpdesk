import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import taqaLogoDark from "../assets/logo_taqa_dark.png";
import "./LoginPage.css";

const TEAMS = [
  "Desktop Support",
  "Security Team",
  "Application Support",
  "Network Team",
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employe");
  const [team, setTeam] = useState(TEAMS[0]);
  const [error, setError] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regRole, setRegRole] = useState("employe");
  const [regTeam, setRegTeam] = useState(TEAMS[0]);
  const [regSuccess, setRegSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your work email.");
      return;
    }

    try {
      const data = await api.login({ email, password, role, team: role === "support" ? team : null });
      login(data.user);
      navigate(data.user.role === "support" ? "/support" : "/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegSuccess("");
    setError("");

    try {
      await api.register({
        name: regName,
        email: regEmail,
        password: regPass,
        role: regRole,
        team: regRole === "support" ? regTeam : null,
      });
      setRegSuccess("Account created successfully! Please sign in using the Sign In tab.");
      setRegName("");
      setRegEmail("");
      setRegPass("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
      </div>

      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-brand-logo-container">
            <img src={taqaLogoDark} alt="TAQA Morocco Logo" className="login-brand-logo-img" />
          </div>
          <h1>TAQA Morocco</h1>
          <p className="login-header-subtitle">Unified IT Incident Management & Support Portal</p>
          <div className="login-badge-secure">
            <span className="secure-dot" /> Enterprise Secure Access
          </div>
        </div>

        {/* Tab switcher */}
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === "login" ? "login-tab-active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
          >
            🔑 Sign In
          </button>
          <button
            className={`login-tab ${tab === "register" ? "login-tab-active" : ""}`}
            onClick={() => { setTab("register"); setError(""); setRegSuccess(""); }}
          >
            📝 Create Account
          </button>
        </div>

        {/* Quick Demo Fill Buttons */}
        {tab === "login" && (
          <div className="login-quick-demo">
            <span className="quick-demo-label">Quick Demo Access:</span>
            <div className="quick-demo-pills">
              <button
                type="button"
                className="demo-pill"
                onClick={() => {
                  setEmail("ahmed.alami@taqa.ma");
                  setPassword("demo123");
                  setRole("employe");
                }}
                title="Fill Employee Account"
              >
                👤 Employee
              </button>
              <button
                type="button"
                className="demo-pill"
                onClick={() => {
                  setEmail("support.desktop@taqa.ma");
                  setPassword("demo123");
                  setRole("support");
                  setTeam("Desktop Support");
                }}
                title="Fill Desktop Support Account"
              >
                💻 Desktop Support
              </button>
              <button
                type="button"
                className="demo-pill"
                onClick={() => {
                  setEmail("support.security@taqa.ma");
                  setPassword("demo123");
                  setRole("support");
                  setTeam("Security Team");
                }}
                title="Fill Security Team Account"
              >
                🛡️ Security Team
              </button>
              <button
                type="button"
                className="demo-pill"
                onClick={() => {
                  setEmail("support.network@taqa.ma");
                  setPassword("demo123");
                  setRole("support");
                  setTeam("Network Team");
                }}
                title="Fill Network Team Account"
              >
                🌐 Network Team
              </button>
            </div>
          </div>
        )}

        {error && <div className="login-error">{error}</div>}
        {regSuccess && <div className="login-success">{regSuccess}</div>}

        {/* Login form */}
        {tab === "login" && (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Work Email</label>
              <input
                type="email"
                placeholder="example@taqa.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Access Role</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${role === "employe" ? "role-active" : ""}`}
                  onClick={() => setRole("employe")}
                >
                  👤 Employee
                </button>
                <button
                  type="button"
                  className={`role-btn ${role === "support" ? "role-active" : ""}`}
                  onClick={() => setRole("support")}
                >
                  🔧 IT Support Team
                </button>
              </div>
            </div>
            {role === "support" && (
              <div className="form-group animate-slide-down">
                <label>Assigned Team</label>
                <select value={team} onChange={(e) => setTeam(e.target.value)}>
                  {TEAMS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="login-submit">
              Sign In
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === "register" && (
          <form className="login-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Ahmed Alami"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>TAQA Work Email</label>
              <input
                type="email"
                placeholder="example@taqa.ma"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Access Role</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${regRole === "employe" ? "role-active" : ""}`}
                  onClick={() => setRegRole("employe")}
                >
                  👤 Employee
                </button>
                <button
                  type="button"
                  className={`role-btn ${regRole === "support" ? "role-active" : ""}`}
                  onClick={() => setRegRole("support")}
                >
                  🔧 IT Support Team
                </button>
              </div>
            </div>
            {regRole === "support" && (
              <div className="form-group animate-slide-down">
                <label>Assigned Team</label>
                <select value={regTeam} onChange={(e) => setRegTeam(e.target.value)}>
                  {TEAMS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="login-submit">
              Register Account
            </button>
          </form>
        )}
      </div>

      {/* Corporate Footer */}
      <footer className="login-footer">
        <p>
          <strong>TAQA Morocco</strong> &bull; Jorf Lasfar Thermal Power Station &bull; Internal IT Support Services
        </p>
        <p className="login-footer-sub">
          Authorized Internal Access Only &bull; Protected under TAQA Information Security Policy
        </p>
      </footer>
    </div>
  );
}
