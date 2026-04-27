"""
Supply Chain Prediction Dashboard

Run from the project root:
    streamlit run dashboard/app.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import datetime
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st

from config import MODELS_DIR, MODELS_DIR_SHIP, MODELS_DIR_LATE

st.set_page_config(
    page_title="Supply Chain Predictor",
    page_icon="📦",
    layout="wide",
)


# ── Loaders ────────────────────────────────────────────────────────────────────
@st.cache_resource
def load_metadata():
    return joblib.load(MODELS_DIR / "metadata.pkl")


@st.cache_resource
def load_model(task: str, model_name: str):
    folder = MODELS_DIR_SHIP if task == "ship" else MODELS_DIR_LATE
    fname = model_name.lower().replace(" ", "_") + ".pkl"
    return joblib.load(folder / fname)


def encode_input(raw: dict, features: list, label_encoders: dict) -> pd.DataFrame:
    row = {}
    for feat in features:
        val = raw[feat]
        if feat in label_encoders:
            le = label_encoders[feat]
            val_str = str(val)
            val = int(le.transform([val_str])[0]) if val_str in le.classes_ else 0
        row[feat] = [val]
    return pd.DataFrame(row)


def feature_importance_chart(model, features: list, title: str):
    importances = pd.Series(model.feature_importances_, index=features)
    importances = importances.sort_values(ascending=True).tail(10)

    fig, ax = plt.subplots(figsize=(6, 4))
    colors = ["#4C72B0"] * len(importances)
    colors[-1] = "#C44E52"  # highlight top feature
    ax.barh(importances.index, importances.values, color=colors)
    ax.set_title(title, fontsize=11)
    ax.set_xlabel("Importance")
    ax.tick_params(labelsize=9)
    fig.tight_layout()
    return fig


# ── Session state — prediction history ────────────────────────────────────────
if "history" not in st.session_state:
    st.session_state.history = []


# ── Load metadata ──────────────────────────────────────────────────────────────
meta = load_metadata()
label_encoders   = meta["label_encoders"]
dropdown_opts    = meta["dropdown_options"]
features_ship    = meta["features_shipping"]
features_late    = meta["features_late"]
model_names      = meta["model_names"]
best_ship        = meta["best_model_shipping"]
best_late        = meta["best_model_late"]
metrics_shipping = meta.get("metrics_shipping", {})
metrics_late     = meta.get("metrics_late", {})


# ── Header ─────────────────────────────────────────────────────────────────────
st.title("📦 Supply Chain Predictor")
st.markdown("Predict **shipment duration** or **late delivery risk** based on order details.")

# ── Sidebar — Model Metrics Panel ─────────────────────────────────────────────
with st.sidebar:
    st.header("📊 Model Performance")
    st.caption("Test-set scores used to select the best model.")

    st.subheader("Shipment Duration")
    if metrics_shipping:
        df_ship_m = pd.DataFrame(metrics_shipping).T
        df_ship_m.index.name = "Model"
        best_row = df_ship_m["R²"].idxmax()
        st.dataframe(
            df_ship_m.style.highlight_max(subset=["R²"], color="#d4edda")
                           .highlight_min(subset=["MAE", "RMSE"], color="#d4edda"),
            use_container_width=True,
        )
        st.caption(f"Best model: **{best_row}** (highest R²)")

    st.subheader("Late Delivery Risk")
    if metrics_late:
        df_late_m = pd.DataFrame(metrics_late).T
        df_late_m.index.name = "Model"
        best_row_late = df_late_m["F1"].idxmax()
        st.dataframe(
            df_late_m.style.highlight_max(subset=["F1", "AUC", "Accuracy"], color="#d4edda"),
            use_container_width=True,
        )
        st.caption(f"Best model: **{best_row_late}** (highest F1)")

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
task_key    = "ship" if is_shipping else "late"

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
        st.markdown("**Order Date & Time**")
        dc1, dc2 = st.columns(2)
        order_date = dc1.date_input("Order Date")
        order_time = dc2.time_input("Order Time")
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
    model = load_model(task_key, best_model)

    st.divider()

    res_col, imp_col = st.columns([1, 1])

    with res_col:
        st.subheader("Prediction Result")
        if is_shipping:
            pred = float(model.predict(X)[0])
            st.success(f"**Predicted Shipment Duration: {pred:.1f} days**")
            result_display = f"{pred:.1f} days"
        else:
            pred_class = int(model.predict(X)[0])
            pred_proba = float(model.predict_proba(X)[0][pred_class])
            label = "🔴 Late Delivery" if pred_class == 1 else "🟢 On Time"
            st.success(f"**{label}** (confidence: {pred_proba:.1%})")
            result_display = f"{'Late' if pred_class == 1 else 'On Time'} ({pred_proba:.1%})"

        st.caption(f"Model used: **{best_model}** (best performing on test set)")

    # ── Feature Importance ─────────────────────────────────────────────────────
    with imp_col:
        st.subheader("Feature Importance")
        fig = feature_importance_chart(
            model, features,
            f"Top drivers — {best_model}",
        )
        st.pyplot(fig, use_container_width=True)
        plt.close(fig)

    # ── Save to history ────────────────────────────────────────────────────────
    record = {
        "Task": task,
        "Model": best_model,
        "Result": result_display,
        "Shipping Mode": user_input.get("Shipping Mode", ""),
        "Market": user_input.get("Market", ""),
        "Sched. Days": user_input.get("Days for shipment (scheduled)", ""),
        "Quantity": user_input.get("Order Item Quantity", ""),
    }
    st.session_state.history.insert(0, record)

    # ── Model Comparison ───────────────────────────────────────────────────────
    st.divider()
    with st.expander("🔁 Compare with other models"):
        st.markdown("Same inputs, every model — see how they differ.")

        rows = []
        for name in model_names:
            m = load_model(task_key, name)
            if is_shipping:
                p = float(m.predict(X)[0])
                rows.append({
                    "Model": name,
                    "Predicted Days": f"{p:.1f}",
                    "Best Model": "✅" if name == best_model else "",
                })
            else:
                pc = int(m.predict(X)[0])
                pp = float(m.predict_proba(X)[0][pc])
                rows.append({
                    "Model": name,
                    "Prediction": "Late" if pc == 1 else "On Time",
                    "Confidence": f"{pp:.1%}",
                    "Best Model": "✅" if name == best_model else "",
                })

        st.table(pd.DataFrame(rows).set_index("Model"))

# ── Prediction History ─────────────────────────────────────────────────────────
if st.session_state.history:
    st.divider()
    st.subheader("🕑 Prediction History")
    st.caption("All predictions made in this session.")
    history_df = pd.DataFrame(st.session_state.history)
    st.dataframe(history_df, use_container_width=True, hide_index=True)
    if st.button("Clear history"):
        st.session_state.history = []
        st.rerun()
