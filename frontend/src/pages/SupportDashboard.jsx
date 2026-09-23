import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import TicketTable from "../components/TicketTable";
import "./SupportDashboard.css";

const TICKET_COLUMNS = [
  { key: "id", label: "Ticket ID" },
  { key: "date", label: "Date" },
  { key: "demandeur", label: "Requester" },
  { key: "description", label: "Description" },
  { key: "priorite", label: "Priority" },
  { key: "statut", label: "Status" },
];

const TEAMS_LIST = [
  "Desktop Support",
  "Security Team",
  "Application Support",
  "Network Team",
];

export default function SupportDashboard() {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState(user.team || TEAMS_LIST[0]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTickets(
        selectedTeam === "ALL" ? {} : { team: selectedTeam }
      );
      setTickets(data);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const toggleStatus = async (ticket) => {
    const isDone = ticket.statut === "Traité" || ticket.statut === "Resolved";
    const newStatus = isDone ? "In Progress" : "Resolved";
    setUpdating(ticket.id);
    try {
      await api.updateTicketStatus(ticket.id, newStatus);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id ? { ...t, statut: newStatus } : t
        )
      );
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdating(null);
    }
  };

  const total = tickets.length;
  const enCours = tickets.filter((t) => t.statut === "En cours" || t.statut === "In Progress").length;
  const traites = tickets.filter((t) => t.statut === "Traité" || t.statut === "Resolved").length;
  const critiques = tickets.filter((t) => t.priorite === "Critique" || t.priorite === "Critical").length;

  const renderActions = (ticket) => {
    const isDone = ticket.statut === "Traité" || ticket.statut === "Resolved";
    return (
      <>
        {!isDone ? (
          <button
            className="action-btn action-resolve"
            onClick={() => toggleStatus(ticket)}
            disabled={updating === ticket.id}
          >
            {updating === ticket.id ? (
              <span className="spinner-sm" />
            ) : (
              "✅ Mark Resolved"
            )}
          </button>
        ) : (
          <button
            className="action-btn action-reopen"
            onClick={() => toggleStatus(ticket)}
            disabled={updating === ticket.id}
          >
            {updating === ticket.id ? (
              <span className="spinner-sm" />
            ) : (
              "🔄 Reopen Ticket"
            )}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="dashboard-page">
      <Navbar />

      {/* Metrics */}
      <div className="metrics-grid">
        <MetricCard
          icon="📥"
          label="Total Tickets Received"
          value={total}
          sub={user.team}
          color="#2563eb"
        />
        <MetricCard
          icon="⏳"
          label="In Progress Tickets"
          value={enCours}
          sub="Pending action"
          color="#f59e0b"
        />
        <MetricCard
          icon="✅"
          label="Resolved Tickets"
          value={traites}
          sub="Completed"
          color="#10b981"
        />
        <MetricCard
          icon="🔴"
          label="Critical Priority"
          value={critiques}
          sub={critiques > 0 ? "Requires Attention" : "None"}
          color="#ef4444"
        />
      </div>

      {/* Tickets table */}
      <div className="card">
        <div className="card-header support-card-header">
          <div className="support-header-title">
            <span className="card-header-icon">📋</span>
            <h2>Queue: {selectedTeam === "ALL" ? "All IT Support Teams" : selectedTeam}</h2>
            <span className="ticket-count-badge">{total} tickets</span>
          </div>

          <div className="support-team-switch">
            <label htmlFor="team-queue-select">Team Queue:</label>
            <select
              id="team-queue-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="team-select-dropdown"
            >
              <option value="ALL">🌐 All Teams (Enterprise View)</option>
              {TEAMS_LIST.map((t) => (
                <option key={t} value={t}>
                  {t} {t === user.team ? " ★ (My Team)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-skeleton">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            columns={TICKET_COLUMNS}
            onAction={renderActions}
          />
        )}
      </div>
    </div>
  );
}
