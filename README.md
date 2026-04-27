# Supply Chain Prediction

Machine learning pipeline that predicts two supply chain outcomes from the [DataCo Smart Supply Chain dataset](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis):

| Task | Type | Target column | Best model |
|------|------|--------------|------------|
| Shipment Duration | Regression | `Days for shipping (real)` | Random Forest (R² = 0.83) |
| Late Delivery Risk | Classification | `Late_delivery_risk` | XGBoost (F1 = 0.727) |

Models compared: **Random Forest**, **XGBoost**, **Gradient Boosting**, **LightGBM**

---

## Project Structure

```
supply chain project/
├── data/
│   ├── raw/                        # Original dataset (not tracked by git)
│   └── preprocessed/               # Cleaned CSV + train/test splits
├── notebooks/
│   ├── data_exploration.ipynb      # EDA — distributions, correlations, temporal patterns
│   ├── preprocessing.ipynb         # Cleaning, missing values, leakage removal
│   ├── feature_engineering.ipynb   # Date features, label encoding, train/test split
│   ├── training.ipynb              # Model training, evaluation, comparison
│   └── tuning.ipynb                # Hyperparameter tuning (placeholder)
├── src/
│   ├── config.py                   # All constants, paths, features, model definitions
│   └── train_models.py             # Training pipeline — saves models + metadata
├── models/
│   ├── shipping/                   # Trained regression models (.pkl)
│   ├── late/                       # Trained classification models (.pkl)
│   └── metadata.pkl                # Label encoders, metrics, feature lists
├── dashboard/
│   └── app.py                      # Streamlit prediction dashboard
└── requirements.txt
```

---

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd "supply chain project"

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Place the raw dataset
#    Download DataCoSupplyChainDataset.csv and put it at:
#    data/raw/DataCoSupplyChainDataset.csv
```

---

## Running the Pipeline

### Step 1 — Notebooks (exploration & preprocessing)

Run in order:

```
notebooks/data_exploration.ipynb
notebooks/preprocessing.ipynb       # produces data/preprocessed/cleaned.csv
notebooks/feature_engineering.ipynb # produces train/test splits
notebooks/training.ipynb            # full evaluation results
```

### Step 2 — Train and save models

```bash
python src/train_models.py
```

This trains all 4 models per task, evaluates them on the test set, and saves everything to `models/`.

### Step 3 — Launch the dashboard

```bash
streamlit run dashboard/app.py
```

---

## Dashboard

The dashboard lets users:

1. **Choose a task** — Shipment Duration or Late Delivery Risk
2. **Enter order details** — dropdowns and inputs based on the model's feature set
3. **Get a prediction** — result from the best model with a feature importance chart
4. **Compare models** — see how all 4 models answer the same inputs
5. **Track history** — all predictions in the session accumulated in a table

The sidebar shows test-set metrics for every model so users know what "best model" means before they predict.

---

## Metrics

**Shipment Duration (Regression)**

| Metric | Role |
|--------|------|
| MAE | Average error in real days — primary operational metric |
| RMSE | Penalises large errors more than MAE |
| R² | Fraction of variance explained — used for model selection |

**Late Delivery Risk (Classification)**

| Metric | Role |
|--------|------|
| Accuracy | Reference only — misleading under class imbalance (~55/45 split) |
| Precision | Cost of false alarms sent to operations |
| Recall | Cost of missed late deliveries |
| F1 | Harmonic mean of Precision/Recall — used for model selection |
| AUC-ROC | Threshold-free ranking quality |

---

## Configuration

All paths, feature lists, and model hyperparameters are defined in [`src/config.py`](src/config.py). To add a model or change a hyperparameter, only that file needs to change.
