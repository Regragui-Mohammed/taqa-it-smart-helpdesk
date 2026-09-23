import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import TicketTable from "../components/TicketTable";
import TicketForm from "../components/TicketForm";
import ChatWidget from "../components/ChatWidget";
import "./EmployeeDashboard.css";

const TICKET_COLUMNS = [
  { key: "id", label: "Ticket ID" },
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "equipe", label: "Assigned Team" },
  { key: "statut", label: "Status" },
];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    const handleAutoTicket = (e) => {
      if (e.detail) {
        setTickets((prev) => [e.detail, ...prev.filter((t) => t.id !== e.detail.id)]);
      } else {
        fetchTickets();
      }
    };

    window.addEventListener("ticket-created", handleAutoTicket);
    return () => window.removeEventListener("ticket-created", handleAutoTicket);
  }, [fetchTickets]);

  const handleTicketCreated = (newTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  const enCours = tickets.filter((t) => t.statut === "En cours" || t.statut === "In Progress").length;
  const resolus = tickets.filter((t) => t.statut === "Traité" || t.statut === "Resolved").length;

  return (
    <div className="dashboard-page">
      <Navbar />

      {/* Metrics row */}
      <div className="metrics-grid">
        <MetricCard
          icon="📋"
          label="Active Requests"
          value={enCours}
          sub="In Progress"
          color="#f59e0b"
        />
        <MetricCard
          icon="✅"
          label="Resolved Tickets"
          value={resolus}
          sub={`+${resolus}`}
          color="#10b981"
        />
        <MetricCard
          icon="🌐"
          label="VPN & IT Systems"
          value="99.8%"
          sub="Operational"
          color="#2563eb"
        />
        <MetricCard
          icon="🕐"
          label="Last Session"
          value="Today"
          sub="08:30"
          color="#8b5cf6"
        />
      </div>

      {/* Main content */}
      <div className="dashboard-grid">
        {/* Left: Profile + Tickets */}
        <div className="dashboard-col-left">
          {/* Profile Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-header-icon">👤</span>
              <h2>Employee Profile & Details</h2>
            </div>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">Full Name</span>
                <span className="profile-value">{user.name}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Work Email</span>
                <span className="profile-value">{user.email}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Department</span>
                <span className="profile-value">Plant Operations &amp; Engineering</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Industrial Site</span>
                <span className="profile-value">Jorf Lasfar Power Station (Units 1-6)</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Internal Extension</span>
                <span className="profile-value">Ext. 4421</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Access Level</span>
                <span className="profile-value profile-status-active">● Active Enterprise User</span>
              </div>
            </div>
          </div>

          {/* Ticket list */}
          <div className="card">
            <div className="card-header">
              <span className="card-header-icon">📋</span>
              <h2>My Recent Support Tickets</h2>
            </div>
            {loading ? (
              <div className="loading-skeleton">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-row" />
                ))}
              </div>
            ) : (
              <TicketTable tickets={tickets} columns={TICKET_COLUMNS} />
            )}
          </div>
        </div>

        {/* Right: Ticket form */}
        <div className="dashboard-col-right">
          <div className="card">
            <div className="card-header">
              <span className="card-header-icon">🚨</span>
              <h2>Submit Support Ticket</h2>
            </div>
            <p className="card-caption">
              Describe your technical issue for automated routing to the dedicated IT support team.
            </p>
            <TicketForm onCreated={handleTicketCreated} />
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}
