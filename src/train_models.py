"""
Train all models and persist them + metadata for the dashboard.

Run from the project root:
    python src/train_models.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
)

from config import (
    DATA_PATH, MODELS_DIR, MODELS_DIR_SHIP, MODELS_DIR_LATE,
    RANDOM_STATE, TEST_SIZE,
    TARGET_SHIPPING, TARGET_LATE,
    BEST_MODEL_SHIPPING, BEST_MODEL_LATE,
    FEATURES_SHIPPING, FEATURES_LATE,
    SHIPPING_MODELS, LATE_MODELS, MODEL_NAMES,
)

MODELS_DIR.mkdir(exist_ok=True)
MODELS_DIR_SHIP.mkdir(exist_ok=True)
MODELS_DIR_LATE.mkdir(exist_ok=True)

# ── Load & feature-engineer ────────────────────────────────────────────────────
print("Loading data …")
df = pd.read_csv(DATA_PATH)

df["order date (DateOrders)"] = pd.to_datetime(df["order date (DateOrders)"], errors="coerce")
df["order_year"]      = df["order date (DateOrders)"].dt.year
df["order_month"]     = df["order date (DateOrders)"].dt.month
df["order_day"]       = df["order date (DateOrders)"].dt.day
df["order_dayofweek"] = df["order date (DateOrders)"].dt.dayofweek
df["order_hour"]      = df["order date (DateOrders)"].dt.hour

# ── Label encode ───────────────────────────────────────────────────────────────
df_encoded = df.copy()
categorical_cols = df_encoded.select_dtypes(include=["object"]).columns.tolist()
label_encoders: dict[str, LabelEncoder] = {}
dropdown_options: dict[str, list] = {}

for col in categorical_cols:
    le = LabelEncoder()
    df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
    label_encoders[col] = le
    dropdown_options[col] = sorted(le.classes_.tolist())

# ── Split ──────────────────────────────────────────────────────────────────────
X_ship = df_encoded[FEATURES_SHIPPING]
y_ship = df_encoded[TARGET_SHIPPING]
X_late = df_encoded[FEATURES_LATE]
y_late = df_encoded[TARGET_LATE]

X_train_ship, X_test_ship, y_train_ship, y_test_ship = train_test_split(
    X_ship, y_ship, test_size=TEST_SIZE, random_state=RANDOM_STATE
)
X_train_late, X_test_late, y_train_late, y_test_late = train_test_split(
    X_late, y_late, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_late
)

# ── Train, evaluate & save ─────────────────────────────────────────────────────
metrics_shipping: dict[str, dict] = {}
metrics_late: dict[str, dict] = {}

print("\nTraining shipping duration models …")
for name, model in SHIPPING_MODELS.items():
    print(f"  {name} …")
    model.fit(X_train_ship, y_train_ship)
    y_pred = model.predict(X_test_ship)
    metrics_shipping[name] = {
        "MAE":  round(float(mean_absolute_error(y_test_ship, y_pred)), 3),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_test_ship, y_pred))), 3),
        "R²":   round(float(r2_score(y_test_ship, y_pred)), 3),
    }
    joblib.dump(model, MODELS_DIR_SHIP / (name.lower().replace(" ", "_") + ".pkl"))

print("\nTraining late delivery models …")
for name, model in LATE_MODELS.items():
    print(f"  {name} …")
    model.fit(X_train_late, y_train_late)
    y_pred  = model.predict(X_test_late)
    y_proba = model.predict_proba(X_test_late)[:, 1]
    metrics_late[name] = {
        "Accuracy":  round(float(accuracy_score(y_test_late, y_pred)), 3),
        "Precision": round(float(precision_score(y_test_late, y_pred)), 3),
        "Recall":    round(float(recall_score(y_test_late, y_pred)), 3),
        "F1":        round(float(f1_score(y_test_late, y_pred)), 3),
        "AUC":       round(float(roc_auc_score(y_test_late, y_proba)), 3),
    }
    joblib.dump(model, MODELS_DIR_LATE / (name.lower().replace(" ", "_") + ".pkl"))

# ── Save metadata ──────────────────────────────────────────────────────────────
metadata = {
    "label_encoders":    label_encoders,
    "dropdown_options":  dropdown_options,
    "features_shipping": FEATURES_SHIPPING,
    "features_late":     FEATURES_LATE,
    "best_model_shipping": BEST_MODEL_SHIPPING,
    "best_model_late":     BEST_MODEL_LATE,
    "model_names":       MODEL_NAMES,
    "target_shipping":   TARGET_SHIPPING,
    "target_late":       TARGET_LATE,
    "metrics_shipping":  metrics_shipping,
    "metrics_late":      metrics_late,
}
joblib.dump(metadata, MODELS_DIR / "metadata.pkl")

print(f"\nAll models and metadata saved to {MODELS_DIR}/")
