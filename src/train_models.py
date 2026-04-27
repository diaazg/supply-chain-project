"""
Train all models and persist them + metadata for the dashboard.

Run from the project root:
    python src/train_models.py
"""

import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import (
    RandomForestRegressor, GradientBoostingRegressor,
    RandomForestClassifier, GradientBoostingClassifier,
)
from xgboost import XGBRegressor, XGBClassifier

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_PATH = ROOT / "data" / "preprocessed" / "cleaned.csv"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ── Constants ──────────────────────────────────────────────────────────────────
RANDOM_STATE = 42
TEST_SIZE = 0.2
TARGET_SHIPPING = "Days for shipping (real)"
TARGET_LATE = "Late_delivery_risk"

DATE_FEATURES = [
    "order_year", "order_month", "order_day",
    "order_dayofweek", "order_hour",
]

FEATURES_SHIPPING = [
    "Type", "Days for shipment (scheduled)", "Customer Country",
    "Customer Segment", "Market", "Order Country", "Order Region",
    "Shipping Mode", "Order Item Quantity", "Latitude", "Longitude",
]

FEATURES_LATE = [
    "Type", "Days for shipment (scheduled)", "Customer Country",
    "Customer Segment", "Market", "Order Country", "Order Region",
    "Shipping Mode", "Order Item Quantity", "Category Name",
    "Latitude", "Longitude",
] + DATE_FEATURES

# ── Load & feature-engineer ────────────────────────────────────────────────────
print("Loading data …")
df = pd.read_csv(DATA_PATH)

df["order date (DateOrders)"] = pd.to_datetime(df["order date (DateOrders)"], errors="coerce")
df["order_year"]       = df["order date (DateOrders)"].dt.year
df["order_month"]      = df["order date (DateOrders)"].dt.month
df["order_day"]        = df["order date (DateOrders)"].dt.day
df["order_dayofweek"]  = df["order date (DateOrders)"].dt.dayofweek
df["order_hour"]       = df["order date (DateOrders)"].dt.hour

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

# ── Define models ──────────────────────────────────────────────────────────────
shipping_models = {
    "Random Forest": RandomForestRegressor(
        n_estimators=300, max_depth=None, min_samples_split=4,
        min_samples_leaf=1, max_features=1.0,
        random_state=RANDOM_STATE, n_jobs=-1,
    ),
    "XGBoost": XGBRegressor(n_estimators=100, random_state=RANDOM_STATE),
    "Gradient Boosting": GradientBoostingRegressor(
        n_estimators=500, learning_rate=0.1, max_depth=4,
        random_state=RANDOM_STATE,
    ),
}

late_models = {
    "Random Forest": RandomForestClassifier(
        n_estimators=100, max_depth=15, min_samples_split=10,
        min_samples_leaf=5, random_state=RANDOM_STATE, n_jobs=-1,
    ),
    "XGBoost": XGBClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=6,
        subsample=0.8, colsample_bytree=0.8,
        random_state=RANDOM_STATE, n_jobs=-1, eval_metric="logloss",
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100, learning_rate=0.1, max_depth=4,
        random_state=RANDOM_STATE,
    ),
}

# ── Train & save ───────────────────────────────────────────────────────────────
print("\nTraining shipping duration models …")
for name, model in shipping_models.items():
    print(f"  {name} …")
    model.fit(X_train_ship, y_train_ship)
    fname = name.lower().replace(" ", "_") + "_ship.pkl"
    joblib.dump(model, MODELS_DIR / fname)

print("\nTraining late delivery models …")
for name, model in late_models.items():
    print(f"  {name} …")
    model.fit(X_train_late, y_train_late)
    fname = name.lower().replace(" ", "_") + "_late.pkl"
    joblib.dump(model, MODELS_DIR / fname)

# ── Save metadata ──────────────────────────────────────────────────────────────
# Best models from training.ipynb: RF for shipping (R²=0.83), XGB for late (F1=0.727)
metadata = {
    "label_encoders": label_encoders,
    "dropdown_options": dropdown_options,
    "features_shipping": FEATURES_SHIPPING,
    "features_late": FEATURES_LATE,
    "best_model_shipping": "Random Forest",
    "best_model_late": "XGBoost",
    "model_names": ["Random Forest", "XGBoost", "Gradient Boosting"],
    "target_shipping": TARGET_SHIPPING,
    "target_late": TARGET_LATE,
}
joblib.dump(metadata, MODELS_DIR / "metadata.pkl")

print(f"\nAll models and metadata saved to {MODELS_DIR}/")
