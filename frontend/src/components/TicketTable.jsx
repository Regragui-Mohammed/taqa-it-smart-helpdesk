import { useState, useMemo } from "react";
import StatusBadge from "./StatusBadge";
import "./TicketTable.css";

export default function TicketTable({ tickets, columns, onAction }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      // Status filter
      if (statusFilter === "in_progress") {
        const isProg = t.statut === "En cours" || t.statut === "In Progress";
        if (!isProg) return false;
      } else if (statusFilter === "resolved") {
        const isDone = t.statut === "Traité" || t.statut === "Resolved";
        if (!isDone) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const idMatch = t.id?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        const catMatch = t.categorie?.toLowerCase().includes(q);
        const teamMatch = t.equipe?.toLowerCase().includes(q);
        const reqMatch = t.demandeur?.toLowerCase().includes(q);
        return idMatch || descMatch || catMatch || teamMatch || reqMatch;
      }

      return true;
    });
  }, [tickets, search, statusFilter]);

  const totalCount = tickets?.length || 0;
  const inProgCount = tickets?.filter((t) => t.statut === "En cours" || t.statut === "In Progress").length || 0;
  const resolvedCount = tickets?.filter((t) => t.statut === "Traité" || t.statut === "Resolved").length || 0;

  if (!tickets || tickets.length === 0) {
    return (
      <div className="ticket-empty">
        <span className="ticket-empty-icon">📭</span>
        <p>No tickets to display at this time.</p>
      </div>
    );
  }

  return (
    <div className="ticket-table-container">
      {/* Table Toolbar */}
      <div className="ticket-table-toolbar">
        <div className="ticket-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tickets by ID, keyword, team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <div className="ticket-filter-tabs">
          <button
            className={`filter-tab ${statusFilter === "all" ? "filter-tab-active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All <span className="tab-count">{totalCount}</span>
          </button>
          <button
            className={`filter-tab ${statusFilter === "in_progress" ? "filter-tab-active" : ""}`}
            onClick={() => setStatusFilter("in_progress")}
          >
            In Progress <span className="tab-count tab-count-prog">{inProgCount}</span>
          </button>
          <button
            className={`filter-tab ${statusFilter === "resolved" ? "filter-tab-active" : ""}`}
            onClick={() => setStatusFilter("resolved")}
          >
            Resolved <span className="tab-count tab-count-done">{resolvedCount}</span>
          </button>
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="ticket-empty-filter">
          <span>🔎</span>
          <p>No tickets match your search or filter.</p>
          <button
            className="filter-reset-btn"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="ticket-table-wrap">
          <table className="ticket-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                {onAction && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket, idx) => (
                <tr key={ticket.id} style={{ animationDelay: `${idx * 0.03}s` }}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.key === "statut" || col.key === "priorite" ? (
                        <StatusBadge value={ticket[col.key]} />
                      ) : col.key === "id" ? (
                        <span className="ticket-id-cell">{ticket[col.key]}</span>
                      ) : (
                        ticket[col.key]
                      )}
                    </td>
                  ))}
                  {onAction && (
                    <td>
                      <div className="ticket-actions">{onAction(ticket)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
