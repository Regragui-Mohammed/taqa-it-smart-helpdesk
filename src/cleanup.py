"""
TAQA IT Smart Helpdesk - Data Cleaning & Preprocessing Pipeline
Handles PII anonymization, text normalization, and spaCy lemmatization.
"""

import os
import re
import sys
import argparse
from pathlib import Path
import pandas as pd

# Safe stdout encoding on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Load spaCy English pipeline
NLP_MODEL = None
try:
    import spacy
    try:
        NLP_MODEL = spacy.load("en_core_web_sm")
    except Exception:
        print("[WARNING] 'en_core_web_sm' not found, loading blank English model.")
        NLP_MODEL = spacy.blank("en")
except ImportError:
    print("[WARNING] spaCy is not installed. Lemmatization will fall back to basic tokenization.")


# ---------------------------------------------------------------------------
# 1. PII Anonymization (Confidential Data Masking)
# ---------------------------------------------------------------------------
RE_EMAIL = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
RE_PHONE = re.compile(r'(\b(?:poste|ext\.?|extension)\s*\d{3,5}\b)|(\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b)', re.IGNORECASE)
RE_EMP_ID = re.compile(r'\b(?:MAT|EMP|ID)[-_]?\d{4,8}\b', re.IGNORECASE)
RE_IP_ADDR = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')

def anonymize_text(text: str) -> str:
    """
    Replaces sensitive Personally Identifiable Information (PII)
    such as corporate emails, phone numbers, matricules, and IP addresses with generic tokens.
    """
    if not isinstance(text, str):
        return ""
    
    t = RE_EMAIL.sub("[EMAIL]", text)
    t = RE_PHONE.sub("[PHONE]", t)
    t = RE_EMP_ID.sub("[EMP_ID]", t)
    t = RE_IP_ADDR.sub("[IP_ADDR]", t)
    return t


# ---------------------------------------------------------------------------
# 2. Text Normalization & Cleaning
# ---------------------------------------------------------------------------
PUNCTUATION_TO_REMOVE = [",", "!", "?", "@", ".", ";", ":", "(", ")", "[", "]", "{", "}", "\"", "'", "`", "~", "*", "^"]
BOILERPLATE_PHRASES = [
    "user reported", "investigation needed", "ticket created",
    "please resolve", "priority high", "as soon as possible", "urgent"
]

STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
    "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself",
    "she", "her", "hers", "herself", "it", "its", "itself", "they", "them",
    "their", "theirs", "themselves", "what", "which", "who", "whom", "this",
    "that", "these", "those", "am", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "having", "do", "does", "did", "doing",
    "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
    "while", "of", "at", "by", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below", "to",
    "from", "up", "down", "in", "out", "on", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why", "how",
    "all", "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "s", "t", "can", "will", "just", "don", "should", "now"
}

def clean_text(text: str) -> str:
    """
    Normalizes casing, strips noise words, removes punctuation, and removes stopwords.
    """
    if not isinstance(text, str):
        return ""
    
    t = text.lower()
    for phrase in BOILERPLATE_PHRASES:
        t = t.replace(phrase, "")
    for p in PUNCTUATION_TO_REMOVE:
        t = t.replace(p, " ")
    
    words = [w for w in t.split() if w and w not in STOP_WORDS]
    return " ".join(words)


# ---------------------------------------------------------------------------
# 3. spaCy Lemmatization Pipeline
# ---------------------------------------------------------------------------
def lemmatize_text(text: str) -> str:
    """
    Lemmatizes text using spaCy's English pipeline (e.g., 'connecting' -> 'connect').
    """
    if not text:
        return ""
    if NLP_MODEL is None:
        return text
    
    doc = NLP_MODEL(text)
    lemmas = [token.lemma_ for token in doc if not token.is_space and not token.is_stop]
    return " ".join(lemmas)


def preprocess_pipeline(text: str) -> str:
    """
    Full end-to-end preprocessing pipeline for a single raw ticket description:
    1. Anonymize PII
    2. Normalize & clean noise
    3. Lemmatize with spaCy
    """
    anonymized = anonymize_text(text)
    cleaned = clean_text(anonymized)
    lemmatized = lemmatize_text(cleaned)
    return lemmatized.strip()


# ---------------------------------------------------------------------------
# 4. Batch Dataset Processor
# ---------------------------------------------------------------------------
def process_dataset(input_csv: str, output_csv: str) -> pd.DataFrame:
    """
    Loads raw CSV export, filters necessary columns, cleans & anonymizes text,
    and writes the processed dataset to output_csv.
    """
    print(f"[CLEANUP] Reading raw data from: {input_csv}")
    df = pd.read_csv(input_csv, encoding="utf-8-sig")

    # Standardize column names
    col_map = {
        "description": "Description",
        "category": "Category",
        "assigned_team": "Assigned_Team",
        "equipe": "Assigned_Team",
        "categorie": "Category",
        "Catégorie_Prédite": "Category"
    }
    df.rename(columns={k: v for k, v in col_map.items() if k in df.columns}, inplace=True)

    required_cols = ["Category", "Description", "Assigned_Team"]
    existing_cols = [c for c in required_cols if c in df.columns]
    if len(existing_cols) < 3:
        raise ValueError(f"Input CSV missing required columns. Found: {df.columns.tolist()}, need: {required_cols}")

    df = df[required_cols].dropna(subset=["Description"]).drop_duplicates()
    print(f"[CLEANUP] Processing {len(df)} records through spaCy pipeline...")

    df["Description"] = df["Description"].apply(preprocess_pipeline)
    df = df[df["Description"].str.strip().str.len() > 0]

    os.makedirs(os.path.dirname(os.path.abspath(output_csv)), exist_ok=True)
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"[CLEANUP] Saved cleaned dataset to: {output_csv} ({len(df)} rows)")
    return df


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    default_input = base_dir / "data" / "raw" / "tickets_raw.csv"
    default_output = base_dir / "data" / "processed" / "data_clean.csv"

    parser = argparse.ArgumentParser(description="Clean and anonymize IT tickets with spaCy.")
    parser.add_argument("--input", default=str(default_input), help="Path to raw CSV file")
    parser.add_argument("--output", default=str(default_output), help="Path to output cleaned CSV file")
    args = parser.parse_args()

    process_dataset(args.input, args.output)
