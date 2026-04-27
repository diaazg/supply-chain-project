"""
Central configuration for the supply chain ML pipeline.

All paths, constants, feature lists, and model hyperparameters live here.
Both train_models.py and dashboard/app.py import from this file.
"""

from pathlib import Path
from sklearn.ensemble import (
    RandomForestRegressor, GradientBoostingRegressor,
    RandomForestClassifier, GradientBoostingClassifier,
)
from xgboost import XGBRegressor, XGBClassifier
from lightgbm import LGBMRegressor, LGBMClassifier

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT              = Path(__file__).parent.parent
DATA_PATH         = ROOT / "data" / "preprocessed" / "cleaned.csv"
MODELS_DIR        = ROOT / "models"
MODELS_DIR_SHIP   = MODELS_DIR / "shipping"
MODELS_DIR_LATE   = MODELS_DIR / "late"

# ── Training ───────────────────────────────────────────────────────────────────
RANDOM_STATE = 42
TEST_SIZE    = 0.2

# ── Targets ───────────────────────────────────────────────────────────────────
TARGET_SHIPPING = "Days for shipping (real)"
TARGET_LATE     = "Late_delivery_risk"

# ── Best models (from training.ipynb evaluation) ───────────────────────────────
BEST_MODEL_SHIPPING = "Random Forest"   # R² = 0.831
BEST_MODEL_LATE     = "XGBoost"         # F1 = 0.732

# ── Features ──────────────────────────────────────────────────────────────────
DATE_FEATURES = [
    "order_year",
    "order_month",
    "order_day",
    "order_dayofweek",
    "order_hour",
]

FEATURES_SHIPPING = [
    "Type",
    "Days for shipment (scheduled)",
    "Customer Country",
    "Customer Segment",
    "Market",
    "Order Country",
    "Order Region",
    "Shipping Mode",
    "Order Item Quantity",
    "Latitude",
    "Longitude",
]

FEATURES_LATE = [
    "Type",
    "Days for shipment (scheduled)",
    "Customer Country",
    "Customer Segment",
    "Market",
    "Order Country",
    "Order Region",
    "Shipping Mode",
    "Order Item Quantity",
    "Category Name",
    "Latitude",
    "Longitude",
] + DATE_FEATURES

# ── Model definitions ─────────────────────────────────────────────────────────
SHIPPING_MODELS: dict = {
    "Random Forest": RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_split=4,
        min_samples_leaf=1,
        max_features=1.0,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),
    "XGBoost": XGBRegressor(
        n_estimators=100,
        random_state=RANDOM_STATE,
    ),
    "Gradient Boosting": GradientBoostingRegressor(
        n_estimators=500,
        learning_rate=0.1,
        max_depth=4,
        random_state=RANDOM_STATE,
    ),
    "LightGBM": LGBMRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=-1,
        num_leaves=63,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=-1,
    ),
}

LATE_MODELS: dict = {
    "Random Forest": RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),
    "XGBoost": XGBClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        eval_metric="logloss",
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=4,
        random_state=RANDOM_STATE,
    ),
    "LightGBM": LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=-1,
        num_leaves=63,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=-1,
    ),
}

MODEL_NAMES = list(SHIPPING_MODELS.keys())
