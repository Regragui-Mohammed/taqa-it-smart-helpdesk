import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import taqaLogoDark from "../assets/logo_taqa_dark.png";
import "./ChatWidget.css";

const QUICK_ACTIONS = [
  { label: "🔑 Forgot Password", prompt: "I forgot my Windows password" },
  { label: "🌐 VPN Issue", prompt: "My TAQA VPN client keeps disconnecting" },
  { label: "🆘 HELP / IT Technician", prompt: "HELP: I need assistance from an IT technician" },
  { label: "✅ Issue Resolved", prompt: "Thank you, my issue has been resolved!" },
];

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello 👋 I'm **Sara**, the IT Support Assistant at TAQA Morocco.\n\nDescribe your technical issue, and I will guide you step by step to resolve it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (textToSend) => {
    const msg = (textToSend || input).trim();
    if (!msg) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const data = await api.sendMessage({
        message: msg,
        user_name: user?.name || "Ahmed Alami",
        user_email: user?.email || "a.alami@taqa.ma",
      });

      // If a ticket was auto-created by the ML model / support fallback
      if (data.ticket) {
        window.dispatchEvent(
          new CustomEvent("ticket-created", { detail: data.ticket })
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          status: data.status,
          ticket: data.ticket,
          assignedTeam: data.assigned_team,
          category: data.category,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Connection error with IT support server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper to format basic markdown (**bold**, newlines)
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split("\n");

    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={lineIdx} className="chat-text-line">
          {renderedParts}
          {lineIdx < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        className={`chat-fab ${open ? "chat-fab-active" : ""}`}
        onClick={() => setOpen(!open)}
        title="TAQA IT Support Assistant (Sara)"
      >
        {open ? (
          <span className="chat-fab-icon">✕</span>
        ) : (
          <div className="chat-fab-content">
            <span className="chat-fab-ai-icon">💬</span>
            <span className="chat-fab-ping" />
          </div>
        )}
        {!open && <span className="chat-fab-badge" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-panel-header">
            <div className="chat-panel-header-left">
              <div className="chat-panel-avatar-badge" title="TAQA Morocco IT Support">
                <img src={taqaLogoDark} alt="TAQA Support" className="chat-header-logo-img" />
              </div>
              <div className="chat-header-info">
                <strong>Sara — IT Assistant</strong>
                <span className="chat-subtitle">
                  <span className="chat-online-dot" /> Online &bull; TAQA Helpdesk
                </span>
              </div>
            </div>
            <button
              className="chat-panel-close"
              onClick={() => setOpen(false)}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chat-panel-messages">
            {messages.map((m, i) => (
              <div key={i} className="chat-message-group">
                <div
                  className={`chat-bubble chat-bubble-${m.role} ${
                    m.ticket ? "chat-bubble-ticket" : ""
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="chat-bubble-content">
                    {renderFormattedText(m.content)}
                  </div>

                  {/* Auto-Created Ticket Card */}
                  {m.ticket && (
                    <div className="chat-ticket-card">
                      <div className="chat-ticket-header">
                        <span className="chat-ticket-badge">
                          🎫 {m.ticket.id}
                        </span>
                        <span className="chat-ticket-status">
                          ● {m.ticket.statut || "In Progress"}
                        </span>
                      </div>
                      <div className="chat-ticket-details">
                        <div className="chat-ticket-row">
                          <span className="chat-ticket-label">Category:</span>
                          <span className="chat-ticket-val">
                            {m.ticket.categorie || "Support"}
                          </span>
                        </div>
                        <div className="chat-ticket-row">
                          <span className="chat-ticket-label">Assigned Team:</span>
                          <span className="chat-ticket-val chat-team-highlight">
                            {m.ticket.equipe}
                          </span>
                        </div>
                        <div className="chat-ticket-row">
                          <span className="chat-ticket-label">Priority:</span>
                          <span className="chat-ticket-val">
                            {m.ticket.priorite || "Normal"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble chat-bubble-assistant chat-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-text">Sara is analyzing your issue...</span>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Quick Actions Chips */}
          <div className="chat-quick-actions">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                className="chat-chip"
                onClick={() => sendMessage(action.prompt)}
                disabled={loading}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="chat-panel-input">
            <input
              type="text"
              placeholder="Describe your technical issue..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
