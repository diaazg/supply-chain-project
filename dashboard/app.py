"""
Supply Chain Prediction Dashboard

Run from the project root:
    streamlit run dashboard/app.py
"""

import joblib
import numpy as np
import pandas as pd
import streamlit as st
from pathlib import Path

# ── Setup ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
MODELS_DIR = ROOT / "models"

st.set_page_config(
    page_title="Supply Chain Predictor",
    page_icon="📦",
    layout="centered",
)


# ── Loaders ────────────────────────────────────────────────────────────────────
@st.cache_resource
def load_metadata():
    return joblib.load(MODELS_DIR / "metadata.pkl")


@st.cache_resource
def load_model(task: str, model_name: str):
    fname = model_name.lower().replace(" ", "_") + f"_{task}.pkl"
    return joblib.load(MODELS_DIR / fname)


def encode_input(raw: dict, features: list, label_encoders: dict) -> pd.DataFrame:
    row = {}
    for feat in features:
        val = raw[feat]
        if feat in label_encoders:
            le = label_encoders[feat]
            val_str = str(val)
            if val_str in le.classes_:
                val = int(le.transform([val_str])[0])
            else:
                val = 0  # fallback for unseen categories
        row[feat] = [val]
    return pd.DataFrame(row)


# ── Main ───────────────────────────────────────────────────────────────────────
meta = load_metadata()
label_encoders  = meta["label_encoders"]
dropdown_opts   = meta["dropdown_options"]
features_ship   = meta["features_shipping"]
features_late   = meta["features_late"]
model_names     = meta["model_names"]
best_ship       = meta["best_model_shipping"]
best_late       = meta["best_model_late"]

st.title("📦 Supply Chain Predictor")
st.markdown("Predict **shipment duration** or **late delivery risk** based on order details.")
st.divider()

# ── Task Selection ─────────────────────────────────────────────────────────────
task = st.radio(
    "Choose prediction task",
    ["Shipment Duration", "Late Delivery Risk"],
    horizontal=True,
)

is_shipping = task == "Shipment Duration"
features    = features_ship if is_shipping else features_late
best_model  = best_ship if is_shipping else best_late

st.subheader("Enter Order Details")

# ── Input Form ─────────────────────────────────────────────────────────────────
user_input: dict = {}

with st.form("prediction_form"):

    col1, col2 = st.columns(2)

    with col1:
        user_input["Type"] = st.selectbox(
            "Payment Type",
            dropdown_opts.get("Type", ["DEBIT", "TRANSFER", "CASH", "PAYMENT"]),
        )
        user_input["Days for shipment (scheduled)"] = st.number_input(
            "Scheduled Shipping Days", min_value=0, max_value=10, value=4, step=1
        )
        user_input["Shipping Mode"] = st.selectbox(
            "Shipping Mode",
            dropdown_opts.get("Shipping Mode", ["Standard Class", "Second Class", "First Class", "Same Day"]),
        )
        user_input["Customer Segment"] = st.selectbox(
            "Customer Segment",
            dropdown_opts.get("Customer Segment", ["Consumer", "Corporate", "Home Office"]),
        )
        user_input["Market"] = st.selectbox(
            "Market",
            dropdown_opts.get("Market", ["Europe", "LATAM", "US", "Pacific Asia", "Africa"]),
        )
        user_input["Order Item Quantity"] = st.number_input(
            "Order Item Quantity", min_value=1, max_value=5, value=1, step=1
        )

    with col2:
        user_input["Customer Country"] = st.selectbox(
            "Customer Country",
            dropdown_opts.get("Customer Country", ["EE. UU."]),
        )
        user_input["Order Country"] = st.selectbox(
            "Order Country",
            dropdown_opts.get("Order Country", ["EE. UU."]),
        )
        user_input["Order Region"] = st.selectbox(
            "Order Region",
            dropdown_opts.get("Order Region", ["Western Europe"]),
        )
        user_input["Latitude"] = st.number_input(
            "Latitude", min_value=-90.0, max_value=90.0, value=39.5, format="%.4f"
        )
        user_input["Longitude"] = st.number_input(
            "Longitude", min_value=-180.0, max_value=180.0, value=-98.35, format="%.4f"
        )

        if not is_shipping:
            user_input["Category Name"] = st.selectbox(
                "Product Category",
                dropdown_opts.get("Category Name", []),
            )

    if not is_shipping:
        st.markdown("**Order Date**")
        order_date = st.date_input("Order Date")
        order_time = st.time_input("Order Time")
        import datetime
        dt = datetime.datetime.combine(order_date, order_time)
        user_input["order_year"]      = dt.year
        user_input["order_month"]     = dt.month
        user_input["order_day"]       = dt.day
        user_input["order_dayofweek"] = dt.weekday()
        user_input["order_hour"]      = dt.hour

    submitted = st.form_submit_button("🔮 Predict", use_container_width=True)

# ── Prediction ─────────────────────────────────────────────────────────────────
if submitted:
    X = encode_input(user_input, features, label_encoders)
    model = load_model("ship" if is_shipping else "late", best_model)

    st.divider()
    st.subheader("Prediction Result")

    if is_shipping:
        pred = model.predict(X)[0]
        st.success(f"**Predicted Shipment Duration: {pred:.1f} days**")
    else:
        pred_class = int(model.predict(X)[0])
        pred_proba = model.predict_proba(X)[0][pred_class]
        label = "🔴 Late Delivery" if pred_class == 1 else "🟢 On Time"
        st.success(f"**{label}** (confidence: {pred_proba:.1%})")

    st.caption(f"Model used: **{best_model}** (best performing on test set)")

    # ── Model Comparison ───────────────────────────────────────────────────────
    st.divider()
    with st.expander("🔁 Compare with other models"):
        st.markdown(
            "The prediction above used the best model. "
            "See how the other models would have answered with the same inputs."
        )

        rows = []
        for name in model_names:
            m = load_model("ship" if is_shipping else "late", name)
            if is_shipping:
                p = m.predict(X)[0]
                rows.append({
                    "Model": name,
                    "Predicted Days": f"{p:.1f}",
                    "Best Model": "✅" if name == best_model else "",
                })
            else:
                pc = int(m.predict(X)[0])
                pp = m.predict_proba(X)[0][pc]
                rows.append({
                    "Model": name,
                    "Prediction": "Late" if pc == 1 else "On Time",
                    "Confidence": f"{pp:.1%}",
                    "Best Model": "✅" if name == best_model else "",
                })

        st.table(pd.DataFrame(rows).set_index("Model"))
