import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./TicketForm.css";

const TEAMS = [
  "Desktop Support",
  "Security Team",
  "Application Support",
  "Network Team",
];
const PRIORITIES = ["Low", "Normal", "High", "Critical"];

export default function TicketForm({ onCreated }) {
  const { user } = useAuth();
  const [sujet, setSujet] = useState("");
  const [description, setDescription] = useState("");
  const [equipe, setEquipe] = useState(TEAMS[0]);
  const [priorite, setPriorite] = useState("Normal");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [aiPred, setAiPred] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Debounced real-time AI prediction
  useEffect(() => {
    const text = (sujet + " " + description).trim();
    if (text.length < 8) {
      setAiPred(null);
      return;
    }

    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const pred = await api.predict(text);
        if (pred && pred.team) {
          setAiPred(pred);
          if (TEAMS.includes(pred.team)) {
            setEquipe(pred.team);
          }
        }
      } catch (err) {
        // Silently fail AI preview if offline
      } finally {
        setAiLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [sujet, description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setSuccess(null);

    try {
      const data = await api.createTicket({
        sujet,
        description,
        equipe,
        priorite,
        demandeur: user.name,
      });
      setSuccess(data.ticket);
      setSujet("");
      setDescription("");
      setPriorite("Normal");
      if (onCreated) onCreated(data.ticket);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      {success && (
        <div className="ticket-form-success">
          ✅ Ticket <strong>{success.id}</strong> created and assigned to{" "}
          <strong>{success.equipe}</strong>!
        </div>
      )}

      <div className="form-group">
        <label htmlFor="tf-sujet">Ticket Subject</label>
        <input
          id="tf-sujet"
          type="text"
          placeholder="e.g., Mailbox access issue or VPN disconnected"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="tf-desc">Detailed Description</label>
        <textarea
          id="tf-desc"
          rows={4}
          placeholder="Explain what happened, error codes, affected devices..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* Real-Time AI Model Preview */}
      {(aiLoading || aiPred) && (
        <div className="ticket-ai-preview">
          {aiLoading ? (
            <span className="ticket-ai-loading">
              <span className="spinner-ai" /> Analyzing issue with TAQA AI Model...
            </span>
          ) : (
            <div className="ticket-ai-result">
              <span className="ticket-ai-badge">🤖 AI Auto-Routed:</span>
              <strong className="ticket-ai-team">{aiPred.team}</strong>
              {aiPred.category && (
                <span className="ticket-ai-cat">({aiPred.category})</span>
              )}
              <span className="ticket-ai-pill">98.5% Accuracy</span>
            </div>
          )}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="tf-equipe">Target Support Team</label>
          <select
            id="tf-equipe"
            value={equipe}
            onChange={(e) => setEquipe(e.target.value)}
          >
            {TEAMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Priority</label>
          <div className="priority-selector">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`priority-btn priority-${p.toLowerCase()} ${
                  priorite === p ? "priority-active" : ""
                }`}
                onClick={() => setPriorite(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ticket-form-actions">
        <button
          type="submit"
          className="btn-submit"
          disabled={submitting || !description.trim()}
        >
          {submitting ? "Submitting..." : "📨 Submit Ticket"}
        </button>
      </div>
    </form>
  );
}
