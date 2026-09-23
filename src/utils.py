"""
TAQA IT Smart Helpdesk - Utility & Integration Module
Deterministic Knowledge Base Search, LLaMA / Ollama Integration, and Automated Ticket Escalation.
"""

import os
import sys
import json
import re
import unicodedata
import requests
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import joblib

# Safe stdout encoding on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_KB_PATH = BASE_DIR / "models" / "knowledge_base.json"
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "model_TAQA.pkl"
DEFAULT_VECT_PATH = BASE_DIR / "models" / "vect_ticket.pkl"
DEFAULT_TICKETS_CSV = BASE_DIR / "data" / "processed" / "tickets_support.csv"


def _log(msg: str):
    """Safe logger that prevents encoding crashes on Windows console."""
    try:
        print(msg)
    except Exception:
        try:
            print(msg.encode("ascii", "replace").decode("ascii"))
        except Exception:
            pass


def _normalize(s: str) -> str:
    """Removes accents and normalizes to lowercase."""
    if not s:
        return ""
    nfd = unicodedata.normalize("NFD", s.lower().strip())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


# ---------------------------------------------------------------------------
# 1. Knowledge Base Loader
# ---------------------------------------------------------------------------
def load_knowledge_base(json_path: str = None) -> list:
    """Loads and returns knowledge base articles from JSON."""
    path = Path(json_path) if json_path else DEFAULT_KB_PATH
    if not path.exists():
        _log(f"[WARNING] Knowledge base file not found at: {path}")
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        _log(f"[ERROR] Failed to load knowledge base: {e}")
        return []


# ---------------------------------------------------------------------------
# 2. Deterministic Knowledge Base Matching (get_solu)
# ---------------------------------------------------------------------------
STOPWORDS = {
    "with", "from", "into", "this", "that", "your", "their", "have", "more",
    "some", "such", "what", "which", "will", "been", "machine", "device",
    "problem", "issue", "error", "help", "avec", "dans", "pour", "cette",
    "votre", "notre", "leurs", "faire", "plus", "tout", "tous", "mon", "mes",
    "ton", "tes", "son", "ses", "une", "des", "les", "que", "qui", "est",
    "sont", "ete", "avoir", "etre", "probleme", "erreur", "aide"
}

def get_solu(user_msg: str, category: str = None, json_path: str = None) -> dict:
    """
    Searches the JSON knowledge base for the best matching solution
    based on predicted category and query keywords.
    Returns status='success' if a genuine matching solution is found,
    or status='not_found' if no procedure matches the issue.
    """
    kb = load_knowledge_base(json_path)
    if not kb:
        return {
            "status": "not_found",
            "chatbot_reply": None,
            "assigned_team": "IT Support",
            "needs_escalation": True,
        }

    user_msg_norm = user_msg.lower().strip()
    user_norm = _normalize(user_msg)
    cat_clean = str(category).strip().lower() if category else ""

    # Score candidates
    scored = []
    for sol in kb:
        sol_cat = sol.get("Category", "").strip().lower()
        title = sol.get("Problem_Title", "")
        keywords = sol.get("Keywords", [])
        
        kw_score = 0
        matched_kw = []

        # 1. Keyword boundary matching
        for key in keywords:
            k = _normalize(str(key))
            if not k or len(k) < 3:
                continue
            pattern = r'\b' + re.escape(k) + r'\b'
            if re.search(pattern, user_norm):
                weight = 4 if len(k) > 6 else 2
                kw_score += weight
                matched_kw.append(k)

        # 2. Title word overlap
        title_norm = _normalize(title)
        user_words = [w for w in re.findall(r'\b\w{4,}\b', user_norm) if w not in STOPWORDS]
        title_words = [w for w in re.findall(r'\b\w{4,}\b', title_norm) if w not in STOPWORDS]
        common = set(user_words) & set(title_words)
        title_score = len(common) * 5

        # 3. Category match bonus
        cat_bonus = 3 if (cat_clean and sol_cat == cat_clean) else 0

        total_score = kw_score + title_score + cat_bonus
        if kw_score > 0 or title_score >= 5:
            scored.append((total_score, sol, matched_kw, common))

    if not scored:
        return {
            "status": "not_found",
            "chatbot_reply": None,
            "assigned_team": "IT Support",
            "needs_escalation": True,
        }

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_sol, matched_kw, matched_title = scored[0]

    if best_score < 4:
        return {
            "status": "not_found",
            "chatbot_reply": None,
            "assigned_team": best_sol.get("Assigned_Team", "IT Support"),
            "needs_escalation": True,
        }

    return {
        "status": "success",
        "chatbot_reply": best_sol.get("Chatbot_Response", ""),
        "assigned_team": best_sol.get("Assigned_Team", "IT Support"),
        "category": best_sol.get("Category", category or "IT"),
        "problem_title": best_sol.get("Problem_Title", ""),
        "score": best_score,
        "matched_keywords": matched_kw,
        "requires_escalation": best_sol.get("Requires_Escalation", False),
    }


# ---------------------------------------------------------------------------
# 3. LLaMA / Ollama Integration (generer_reponse_llama)
# ---------------------------------------------------------------------------
def _simplified_response(raw_solution: str) -> str:
    """Clean fallback formatting when Ollama is unavailable or timed out."""
    lines = raw_solution.strip().split("\n")
    formatted = []
    step_num = 1

    for line in lines:
        line_s = line.strip()
        if re.match(r'^#{1,4}\s*(Step|Étape)\s*\d+', line_s, re.IGNORECASE):
            clean_title = re.sub(r'^#{1,4}\s*', '', line_s)
            formatted.append(f"\n**{clean_title}**")
        elif line_s.startswith("- ") or line_s.startswith("* "):
            formatted.append(f"  • {line_s[2:]}")
        elif re.match(r'^\d+\.\s', line_s):
            formatted.append(f"  {line_s}")
        elif line_s.startswith("## ") or line_s.startswith("# "):
            formatted.append(f"### {line_s.lstrip('#').strip()}")
        elif line_s:
            formatted.append(line_s)

    header = "Here are the recommended steps to resolve your issue:\n\n"
    return header + "\n".join(formatted)


def generer_reponse_llama(user_query: str, raw_solution: str, model_name: str = "llama3.2") -> str:
    """
    Calls local Ollama instance (default llama3.2) to formulate a helpful,
    numbered step-by-step troubleshooting response.
    Falls back gracefully to formatted markdown if Ollama is unreachable.
    """
    if not raw_solution:
        return "I'm sorry, I could not find a resolution procedure for this issue."

    prompt = f"""You are 'Sara', the professional IT Support Assistant at TAQA Morocco.
A user is experiencing this technical issue: "{user_query}"

Below is the verified resolution procedure from our corporate knowledge base:
---
{raw_solution}
---

Your Instructions:
1. Greet the user warmly and concisely.
2. Provide the exact steps from the procedure above in a clear, numbered sequence (Step 1, Step 2...).
3. Keep technical commands and links intact (e.g. portal.taqa.ma).
4. Do NOT invent steps not present in the procedure.
5. End with a friendly closing asking if this resolved their issue or if they need technician assistance.
Output in clear Markdown."""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                    "num_predict": 450,
                },
            },
            timeout=12,
        )
        if response.status_code == 200:
            result = response.json().get("response", "").strip()
            if result:
                return result
    except requests.exceptions.Timeout:
        _log("[OLLAMA] Timeout (>12s) -> Fast fallback applied")
    except Exception as e:
        _log(f"[OLLAMA] Service unreachable ({e}) -> Fast fallback applied")

    return _simplified_response(raw_solution)


# ---------------------------------------------------------------------------
# 4. ML Ticket Classifier
# ---------------------------------------------------------------------------
_CACHED_MODEL = None
_CACHED_VECT = None

def predict_category_and_team(text: str, model_path: str = None, vect_path: str = None) -> tuple:
    """
    Predicts (Category, Assigned_Team) for a ticket description using trained models.
    Falls back to expert keyword rules if model files are not yet trained.
    """
    global _CACHED_MODEL, _CACHED_VECT

    m_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
    v_path = Path(vect_path) if vect_path else DEFAULT_VECT_PATH

    if _CACHED_MODEL is None and m_path.exists():
        try:
            _CACHED_MODEL = joblib.load(m_path)
            _CACHED_VECT = joblib.load(v_path)
        except Exception as e:
            _log(f"[ML] Error loading model files: {e}")

    if _CACHED_MODEL is not None and _CACHED_VECT is not None:
        try:
            vec = _CACHED_VECT.transform([text])
            pred = _CACHED_MODEL.predict(vec)[0]
            return str(pred[0]).strip(), str(pred[1]).strip()
        except Exception as e:
            _log(f"[ML] Prediction error: {e}")

    # Fallback keyword rules
    t_lower = text.lower()
    if any(w in t_lower for w in ["network", "vpn", "wifi", "router", "cisco", "ethernet", "ip address"]):
        return "Network", "Network Team"
    elif any(w in t_lower for w in ["security", "virus", "malware", "phishing", "ransomware", "hacked"]):
        return "Security", "Security Team"
    elif any(w in t_lower for w in ["sap", "oracle", "database", "fiori", "application", "software"]):
        return "Software", "Application Support"
    elif any(w in t_lower for w in ["password", "mfa", "login", "account", "locked", "badge"]):
        return "Access", "Desktop Support"
    else:
        return "Hardware", "Desktop Support"


# ---------------------------------------------------------------------------
# 5. Ticket Persistence (Auto-escalation)
# ---------------------------------------------------------------------------
def create_ticket_record(
    description: str,
    category: str,
    team: str,
    demandeur: str = "Employee",
    csv_path: str = None
) -> dict:
    """
    Creates a new support ticket and appends it to tickets_support.csv.
    """
    path = Path(csv_path) if csv_path else DEFAULT_TICKETS_CSV
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Priority estimation
    is_crit = any(w in description.lower() for w in ["ransom", "intrusion", "fire", "outage", "emergency"])
    priorite = "Critical" if is_crit else ("High" if category in ["Security", "Network"] else "Normal")

    # Generate ticket ID
    ticket_count = 1001
    if path.exists():
        try:
            import pandas as pd
            df = pd.read_csv(path)
            ticket_count = 1001 + len(df)
        except Exception:
            pass

    ticket_id = f"TCK-{ticket_count}"
    ticket = {
        "id": ticket_id,
        "date": now_str,
        "demandeur": demandeur,
        "description": description,
        "categorie": category,
        "equipe": team,
        "priorite": priorite,
        "statut": "In Progress"
    }

    try:
        import pandas as pd
        path.parent.mkdir(parents=True, exist_ok=True)
        new_row = pd.DataFrame([{
            "Date": now_str,
            "Description": description,
            "Catégorie_Prédite": category,
            "Assigned_Team": team,
            "Statut": "In Progress"
        }])
        if path.exists():
            df_old = pd.read_csv(path, encoding="utf-8-sig")
            df_all = pd.concat([df_old, new_row], ignore_index=True)
        else:
            df_all = new_row
        df_all.to_csv(path, index=False, encoding="utf-8-sig")
    except Exception as e:
        _log(f"[PERSISTENCE] Error saving ticket: {e}")

    return ticket
