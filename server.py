"""
TAQA IT Smart Helpdesk - Modern REST API Backend
Powered by Flask, Scikit-Learn MultiOutput Classifier, spaCy Preprocessing,
and Local LLaMA 3.2 via Ollama.
Serves the Modern React Frontend at http://localhost:5173.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Windows console encoding fix
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.utils import (
    load_knowledge_base,
    get_solu,
    generer_reponse_llama,
    predict_category_and_team,
    create_ticket_record
)

app = Flask(__name__, static_folder="frontend/dist", static_url_path="")
CORS(app)

MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

KB_PATH = MODELS_DIR / "knowledge_base.json"
MODEL_PATH = MODELS_DIR / "model_TAQA.pkl"
VECT_PATH = MODELS_DIR / "vect_ticket.pkl"
TICKETS_CSV = DATA_DIR / "processed" / "tickets_support.csv"

# In-memory ticket cache initialized from CSV
TICKETS = []
_next_id = 1001

def load_initial_tickets():
    global TICKETS, _next_id
    if TICKETS_CSV.exists():
        try:
            import pandas as pd
            df = pd.read_csv(TICKETS_CSV, encoding="utf-8-sig")
            for i, row in df.iterrows():
                tid = f"TCK-{1001 + i}"
                TICKETS.append({
                    "id": tid,
                    "date": str(row.get("Date", datetime.now().strftime("%Y-%m-%d %H:%M"))),
                    "demandeur": "Employee",
                    "description": str(row.get("Description", "")),
                    "categorie": str(row.get("Catégorie_Prédite", row.get("Category", "Hardware"))),
                    "equipe": str(row.get("Assigned_Team", "Desktop Support")),
                    "priorite": "High" if str(row.get("Category")) in ["Security", "Network"] else "Normal",
                    "statut": str(row.get("Statut", "In Progress"))
                })
            _next_id = 1001 + len(TICKETS)
            print(f"[DATA] Loaded {len(TICKETS)} tickets into memory.")
        except Exception as e:
            print(f"[DATA] Error reading CSV: {e}")

load_initial_tickets()

# Load Knowledge Base into memory
KNOWLEDGE_BASE = load_knowledge_base(str(KB_PATH))
print(f"[KB] Loaded {len(KNOWLEDGE_BASE)} verified IT solutions from {KB_PATH}")


# ===========================================================================
# API Routes
# ===========================================================================

# ---- Health Check --------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "TAQA IT Smart Helpdesk Backend",
        "version": "2.0.0 (React + Flask Architecture)",
        "knowledge_articles": len(KNOWLEDGE_BASE),
        "tickets_count": len(TICKETS)
    })


# ---- Auth ----------------------------------------------------------------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").strip()
    role = data.get("role", "employe")
    team = data.get("team")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    name = email.split("@")[0].replace(".", " ").title()
    return jsonify({
        "success": True,
        "user": {
            "name": name,
            "email": email,
            "role": role,
            "team": team,
        }
    })


# ---- Tickets -------------------------------------------------------------
@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    team = request.args.get("team")
    demandeur = request.args.get("demandeur")

    filtered = TICKETS
    if team:
        filtered = [t for t in filtered if t.get("equipe") == team]
    if demandeur:
        filtered = [t for t in filtered if t.get("demandeur") == demandeur]

    return jsonify(filtered)


@app.route("/api/tickets", methods=["POST"])
def create_ticket():
    global _next_id
    data = request.json or {}
    description = data.get("description", "").strip()
    if not description:
        return jsonify({"error": "Description is required"}), 400

    sujet = data.get("sujet", "")
    full_desc = f"{sujet}: {description}" if sujet else description
    demandeur = data.get("demandeur", "Employee")

    cat_pred, team_pred = predict_category_and_team(
        full_desc, str(MODEL_PATH), str(VECT_PATH)
    )
    equipe = data.get("equipe") or team_pred
    categorie = data.get("categorie") or cat_pred

    ticket = create_ticket_record(
        description=full_desc,
        category=categorie,
        team=equipe,
        demandeur=demandeur,
        csv_path=str(TICKETS_CSV)
    )
    TICKETS.insert(0, ticket)
    return jsonify({"success": True, "ticket": ticket}), 201


@app.route("/api/tickets/<ticket_id>/status", methods=["PATCH"])
def update_ticket_status(ticket_id):
    data = request.json or {}
    new_status = data.get("statut")
    if not new_status:
        return jsonify({"error": "Status is required"}), 400

    for ticket in TICKETS:
        if ticket["id"] == ticket_id:
            ticket["statut"] = new_status
            return jsonify({"success": True, "ticket": ticket})

    return jsonify({"error": "Ticket not found"}), 404


# ---- Intelligent Chatbot (Sara) ------------------------------------------
MOTS_SALUTATIONS = {
    "hello", "hi", "hey", "bonjour", "salut", "salam", "bonsoir", "coucou", "good morning", "good afternoon"
}

MOTS_REMERCIEMENTS = [
    "thank", "thanks", "merci", "resolved", "fixed", "c'est bon", "ça marche",
    "ca marche", "resolu", "résolu", "perfect", "great", "chokran"
]

MOTS_ESCALADE = [
    "help", "technician", "agent", "ticket", "create ticket", "open ticket",
    "human", "support", "not working", "broken", "makhdamch", "aide"
]


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}
    message = data.get("message", "").strip()
    user_name = data.get("user_name", "Employee")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    msg_lower = message.lower().strip()

    # 1. Greetings
    if msg_lower in MOTS_SALUTATIONS or any(msg_lower.startswith(g) for g in ["hello", "hi ", "hey", "salam"]):
        return jsonify({
            "reply": (
                "Hello! 👋 I'm **Sara**, your IT Support Assistant at TAQA Morocco.\n\n"
                "Describe the technical issue you are experiencing, and I will guide you step by step to resolve it."
            ),
            "status": "greeting"
        })

    # 2. Issue Resolved / Gratitude
    if any(r in msg_lower for r in MOTS_REMERCIEMENTS):
        return jsonify({
            "reply": (
                "Glad to have helped! 🎉\n\n"
                "Your issue is marked as resolved. Feel free to ask anytime you need technical assistance. Have a great day!"
            ),
            "status": "resolved"
        })

    # 3. Explicit Help / Urgent Request
    if any(e in msg_lower for e in MOTS_ESCALADE) and len(msg_lower) < 60:
        cat_pred, team_pred = predict_category_and_team(
            message, str(MODEL_PATH), str(VECT_PATH)
        )
        ticket = create_ticket_record(
            description=f"Direct technician assistance requested: {message}",
            category=cat_pred,
            team=team_pred,
            demandeur=user_name,
            csv_path=str(TICKETS_CSV)
        )
        TICKETS.insert(0, ticket)
        return jsonify({
            "reply": (
                f"Understood! Since you need direct technician intervention, I have opened a support ticket for you:\n\n"
                f"🎫 **Ticket #{ticket['id']} Created Successfully**\n"
                f"• **Category**: {cat_pred}\n"
                f"• **Assigned Team**: {team_pred}\n"
                f"• **Status**: In Progress\n\n"
                f"A specialist from the **{team_pred}** team has been alerted and will assist you directly."
            ),
            "status": "ticket_created",
            "ticket": ticket
        })

    # 4. AI Pipeline: ML Prediction + Knowledge Base Lookup + LLaMA
    cat_pred, team_pred = predict_category_and_team(
        message, str(MODEL_PATH), str(VECT_PATH)
    )
    res_kb = get_solu(message, category=cat_pred, json_path=str(KB_PATH))

    if res_kb.get("status") == "success":
        raw_solution = res_kb.get("chatbot_reply", "")
        team = res_kb.get("assigned_team", team_pred)
        cat = res_kb.get("category", cat_pred)
        title = res_kb.get("problem_title", "")

        sara_reply = generer_reponse_llama(message, raw_solution)
        return jsonify({
            "reply": sara_reply,
            "status": "solution_found",
            "category": cat,
            "assigned_team": team,
            "problem_title": title
        })
    else:
        ticket = create_ticket_record(
            description=message,
            category=cat_pred,
            team=team_pred,
            demandeur=user_name,
            csv_path=str(TICKETS_CSV)
        )
        TICKETS.insert(0, ticket)
        return jsonify({
            "reply": (
                f"I couldn't find an automated resolution procedure for this issue in our knowledge base.\n\n"
                f"🎫 **I have forwarded your request directly to IT Support:**\n"
                f"• **Reference**: {ticket['id']}\n"
                f"• **Detected Category**: {cat_pred}\n"
                f"• **Assigned Team**: {team_pred}\n"
                f"• **Status**: In Progress\n\n"
                f"A technician from the **{team_pred}** team has received your ticket and will contact you shortly."
            ),
            "status": "ticket_created",
            "ticket": ticket
        })



# ---- Real-Time AI Prediction ---------------------------------------------
@app.route("/api/predict", methods=["POST"])
def predict_ticket():
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Text is required"}), 400
    try:
        cat_pred, team_pred = predict_category_and_team(
            text, str(MODEL_PATH), str(VECT_PATH)
        )
        return jsonify({
            "category": cat_pred,
            "team": team_pred
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Knowledge Base ------------------------------------------------------
@app.route("/api/knowledge", methods=["GET"])
def get_knowledge():
    category = request.args.get("category")
    if category:
        filtered = [a for a in KNOWLEDGE_BASE if a.get("Category") == category]
        return jsonify(filtered)
    return jsonify(KNOWLEDGE_BASE)


# ---- Serve React Production Build ---------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    dist_dir = BASE_DIR / "frontend" / "dist"
    if path and (dist_dir / path).exists():
        return send_from_directory(dist_dir, path)
    if (dist_dir / "index.html").exists():
        return send_from_directory(dist_dir, "index.html")
    return jsonify({
        "message": "TAQA IT Smart Helpdesk Backend API is running.",
        "frontend": "Launch React dev server with: cd frontend && npm run dev"
    })


if __name__ == "__main__":
    print("==================================================")
    print(" TAQA IT Smart Helpdesk - REST API Server Running")
    print(" Backend: http://localhost:5000")
    print(" React Frontend: http://localhost:5173")
    print("==================================================")
    app.run(debug=True, port=5000)
