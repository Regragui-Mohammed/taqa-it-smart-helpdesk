const API_BASE = "http://localhost:5000/api";

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

export const api = {
  // Auth
  login: (payload) =>
    request("/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) =>
    request("/register", { method: "POST", body: JSON.stringify(payload) }),

  // Tickets
  getTickets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tickets${qs ? `?${qs}` : ""}`);
  },
  createTicket: (payload) =>
    request("/tickets", { method: "POST", body: JSON.stringify(payload) }),
  updateTicketStatus: (id, statut) =>
    request(`/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ statut }),
    }),

  // AI Prediction
  predict: (text) =>
    request("/predict", { method: "POST", body: JSON.stringify({ text }) }),

  // Chat
  sendMessage: (payload) => {
    const body = typeof payload === "string" ? { message: payload } : payload;
    return request("/chat", { method: "POST", body: JSON.stringify(body) });
  },

  // Knowledge
  getKnowledge: (category) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return request(`/knowledge${qs}`);
  },
};
