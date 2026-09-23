"""
TAQA IT Smart Helpdesk - Machine Learning Model Training & Evaluation
Trains MultiOutputClassifier with TF-IDF Vectorization for (Category, Assigned_Team) prediction.
Includes GridSearchCV optimization and model export.
"""

import os
import sys
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

# Safe stdout encoding on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def train_and_export_model(
    data_path: str,
    output_dir: str,
    tune_hyperparams: bool = False,
    test_size: float = 0.2,
    random_state: int = 42
) -> dict:
    """
    Trains TF-IDF + MultiOutputClassifier(LinearSVC) on data_clean.csv.
    Exports 'ticket_pipeline.pkl', 'model_TAQA.pkl', and 'vect_ticket.pkl'.
    """
    print(f"\n=======================================================")
    print(f" TAQA IT Smart Helpdesk - Model Training Pipeline")
    print(f"=======================================================")
    print(f"[DATA] Loading dataset from: {data_path}")

    df = pd.read_csv(data_path, encoding="utf-8-sig")
    df = df.dropna(subset=["Description", "Category", "Assigned_Team"]).drop_duplicates()
    print(f"[DATA] Loaded {len(df)} cleaned ticket records.")
    print(f"[DATA] Unique Categories ({len(df['Category'].unique())}): {df['Category'].unique().tolist()}")
    print(f"[DATA] Unique Teams ({len(df['Assigned_Team'].unique())}): {df['Assigned_Team'].unique().tolist()}")

    X = df["Description"].astype(str)
    y = df[["Category", "Assigned_Team"]]

    # 1. Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=True
    )
    print(f"[SPLIT] Training samples: {len(X_train)} | Test samples: {len(X_test)}")

    # 2. Vectorization (TF-IDF)
    print("[TF-IDF] Fitting TfidfVectorizer (max_features=5000, ngram_range=(1,2))...")
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        sublinear_tf=True
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # 3. Base Model
    base_svc = LinearSVC(C=1.0, random_state=random_state, max_iter=2000)
    multi_model = MultiOutputClassifier(base_svc)

    # 4. Hyperparameter Tuning (Optional)
    if tune_hyperparams:
        print("[GRID SEARCH] Performing hyperparameter tuning with 3-fold cross validation...")
        param_grid = {
            "estimator__C": [0.1, 1.0, 5.0, 10.0],
            "estimator__class_weight": [None, "balanced"],
            "estimator__max_iter": [1500, 3000]
        }
        grid_search = GridSearchCV(
            estimator=multi_model,
            param_grid=param_grid,
            cv=3,
            n_jobs=-1,
            verbose=1
        )
        grid_search.fit(X_train_vec, y_train)
        print(f"[GRID SEARCH] Best Parameters: {grid_search.best_params_}")
        final_model = grid_search.best_estimator_
    else:
        print("[TRAINING] Fitting MultiOutputClassifier(LinearSVC)...")
        multi_model.fit(X_train_vec, y_train)
        final_model = multi_model

    # 5. Evaluation
    print("\n--- Model Evaluation on Test Set ---")
    y_pred = final_model.predict(X_test_vec)
    y_pred_df = pd.DataFrame(y_pred, columns=["Category", "Assigned_Team"], index=y_test.index)

    cat_acc = accuracy_score(y_test["Category"], y_pred_df["Category"])
    team_acc = accuracy_score(y_test["Assigned_Team"], y_pred_df["Assigned_Team"])
    joint_acc = np.mean((y_test["Category"] == y_pred_df["Category"]) & (y_test["Assigned_Team"] == y_pred_df["Assigned_Team"]))

    print(f"Accuracy (Category)     : {cat_acc * 100:.2f}%")
    print(f"Accuracy (Assigned Team): {team_acc * 100:.2f}%")
    print(f"Exact Match Ratio       : {joint_acc * 100:.2f}%")

    print("\n[Classification Report - Category]")
    print(classification_report(y_test["Category"], y_pred_df["Category"], zero_division=0))

    print("\n[Classification Report - Assigned Team]")
    print(classification_report(y_test["Assigned_Team"], y_pred_df["Assigned_Team"], zero_division=0))

    # 6. Combined End-to-End Pipeline
    pipeline = Pipeline([
        ("tfidf", vectorizer),
        ("classifier", final_model)
    ])

    # 7. Model Persistence
    os.makedirs(output_dir, exist_ok=True)
    pipeline_file = os.path.join(output_dir, "ticket_pipeline.pkl")
    model_file = os.path.join(output_dir, "model_TAQA.pkl")
    vect_file = os.path.join(output_dir, "vect_ticket.pkl")

    joblib.dump(pipeline, pipeline_file)
    joblib.dump(final_model, model_file)
    joblib.dump(vectorizer, vect_file)

    print(f"\n[EXPORT] Models successfully saved to '{output_dir}':")
    print(f"  ✓ {pipeline_file} (Full Pipeline)")
    print(f"  ✓ {model_file} (MultiOutput Classifier)")
    print(f"  ✓ {vect_file} (TF-IDF Vectorizer)")

    return {
        "pipeline": pipeline,
        "category_accuracy": cat_acc,
        "team_accuracy": team_acc,
        "joint_accuracy": joint_acc
    }


def evaluate_model(model_path: str, vect_path: str, data_path: str):
    """Evaluates an already exported model against a dataset."""
    model = joblib.load(model_path)
    vect = joblib.load(vect_path)
    df = pd.read_csv(data_path, encoding="utf-8-sig")

    X_vec = vect.transform(df["Description"].astype(str))
    y_true = df[["Category", "Assigned_Team"]]
    y_pred = model.predict(X_vec)

    print("Category Accuracy:", accuracy_score(y_true["Category"], y_pred[:, 0]))
    print("Team Accuracy    :", accuracy_score(y_true["Assigned_Team"], y_pred[:, 1]))


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    default_data = base_dir / "data" / "processed" / "data_clean.csv"
    default_output = base_dir / "models"

    parser = argparse.ArgumentParser(description="Train TAQA ITSM classification model.")
    parser.add_argument("--data", default=str(default_data), help="Path to processed data_clean.csv")
    parser.add_argument("--output", default=str(default_output), help="Directory to save .pkl models")
    parser.add_argument("--tune", action="store_true", help="Run GridSearchCV tuning")
    args = parser.parse_args()

    train_and_export_model(args.data, args.output, tune_hyperparams=args.tune)
