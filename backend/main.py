"""
FastAPI backend for the Supply Chain Predictor.
Run from the project root:
    uvicorn backend.main:app --reload --port 8000
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

from config import MODELS_DIR, MODELS_DIR_SHIP, MODELS_DIR_LATE

app = FastAPI(title="Supply Chain Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Load everything once at startup ───────────────────────────────────────────
meta             = joblib.load(MODELS_DIR / "metadata.pkl")
label_encoders   = meta["label_encoders"]
dropdown_opts    = meta["dropdown_options"]
features_ship    = meta["features_shipping"]
features_late    = meta["features_late"]
model_names      = meta["model_names"]
best_ship        = meta["best_model_shipping"]
best_late        = meta["best_model_late"]
metrics_shipping = meta.get("metrics_shipping", {})
metrics_late     = meta.get("metrics_late", {})

_model_cache: dict = {}

def get_model(task: str, name: str):
    key = f"{task}:{name}"
    if key not in _model_cache:
        folder = MODELS_DIR_SHIP if task == "ship" else MODELS_DIR_LATE
        _model_cache[key] = joblib.load(folder / (name.lower().replace(" ", "_") + ".pkl"))
    return _model_cache[key]


def encode_row(raw: dict, features: list) -> pd.DataFrame:
    row = {}
    for feat in features:
        val = raw[feat]
        if feat in label_encoders:
            le = label_encoders[feat]
            val_str = str(val)
            val = int(le.transform([val_str])[0]) if val_str in le.classes_ else 0
        row[feat] = [val]
    return pd.DataFrame(row)


# ── Schema ─────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    task: str           # "ship" | "late"
    inputs: dict[str, Any]


# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.get("/meta")
def get_meta():
    return {
        "dropdown_options":   dropdown_opts,
        "features_shipping":  features_ship,
        "features_late":      features_late,
        "model_names":        model_names,
        "best_model_shipping": best_ship,
        "best_model_late":    best_late,
        "metrics_shipping":   metrics_shipping,
        "metrics_late":       metrics_late,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    task    = req.task
    features = features_ship if task == "ship" else features_late
    best     = best_ship if task == "ship" else best_late
    model    = get_model(task, best)
    X        = encode_row(req.inputs, features)

    importances = [
        {"feature": f, "importance": float(v)}
        for f, v in sorted(
            zip(features, model.feature_importances_),
            key=lambda x: x[1],
        )[-10:]
    ]

    if task == "ship":
        pred = float(model.predict(X)[0])
        result = {"type": "regression", "value": round(pred, 2), "label": f"{pred:.1f} days"}
    else:
        pred_class = int(model.predict(X)[0])
        pred_proba = float(model.predict_proba(X)[0][pred_class])
        result = {
            "type":       "classification",
            "class":      pred_class,
            "label":      "Late Delivery" if pred_class == 1 else "On Time",
            "confidence": round(pred_proba, 4),
        }

    # all-model comparison
    comparison = []
    for name in model_names:
        m = get_model(task, name)
        if task == "ship":
            p = float(m.predict(X)[0])
            comparison.append({"model": name, "value": round(p, 2), "label": f"{p:.1f} days", "best": name == best})
        else:
            pc = int(m.predict(X)[0])
            pp = float(m.predict_proba(X)[0][pc])
            comparison.append({"model": name, "class": pc, "label": "Late" if pc == 1 else "On Time",
                                "confidence": round(pp, 4), "best": name == best})

    return {
        "result":       result,
        "best_model":   best,
        "importances":  importances,
        "comparison":   comparison,
    }
