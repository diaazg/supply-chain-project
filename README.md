# Supply Chain Prediction

Machine learning pipeline that predicts two supply chain outcomes from the [DataCo Smart Supply Chain dataset](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis), served through a modern **Next.js + FastAPI** web application.

| Task | Type | Target column | Best model |
|------|------|--------------|------------|
| Shipment Duration | Regression | `Days for shipping (real)` | Random Forest (R² = 0.831) |
| Late Delivery Risk | Classification | `Late_delivery_risk` | XGBoost (F1 = 0.732) |

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
├── backend/
│   └── main.py                     # FastAPI server — loads models, exposes /meta and /predict
├── frontend/
│   ├── app/                        # Next.js App Router pages and global CSS
│   ├── components/                 # React components (charts, cards, tables)
│   ├── lib/
│   │   └── api.ts                  # Typed fetch wrappers for the FastAPI backend
│   └── package.json
└── requirements.txt
```

---

## Setup

### Python environment

```bash
# 1. Clone the repo
git clone <repo-url>
cd "supply chain project"

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Place the raw dataset
#    Download DataCoSupplyChainDataset.csv and put it at:
#    data/raw/DataCoSupplyChainDataset.csv
```

### Frontend dependencies

```bash
cd frontend
npm install
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

Trains all 4 models per task, evaluates on the test set, and saves everything to `models/`.

### Step 3 — Start the app

Open **two terminals** from the project root:

**Terminal 1 — FastAPI backend**
```bash
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Next.js frontend**
```bash
cd frontend && npm run dev
```

Then open **http://localhost:3000**.

---

## Web Application

The UI is a full-stack web app built with **Next.js 16** (frontend) and **FastAPI** (backend).

### Frontend stack

| Library | Purpose |
|---------|---------|
| Next.js 16 + React 19 | App framework, App Router |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Page and element animations |
| Recharts | Interactive feature importance bar chart |
| Lucide React | Icons |

### Backend

| Library | Purpose |
|---------|---------|
| FastAPI | REST API serving predictions |
| Uvicorn | ASGI server |
| scikit-learn / XGBoost / LightGBM | Model inference |
| joblib | Model + metadata loading |

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/meta` | Returns dropdown options, feature lists, model names, and test-set metrics |
| `POST` | `/predict` | Accepts `{ task, inputs }`, returns prediction, feature importances, and all-model comparison |

### Features

1. **Choose a task** — Shipment Duration or Late Delivery Risk
2. **Enter order details** — dropdowns and numeric inputs populated from real training data options
3. **Get a prediction** — animated result card (days remaining or on-time/late with confidence bar)
4. **Feature importance chart** — interactive horizontal bar chart showing top 10 model drivers
5. **Compare all models** — collapsible table with every model's answer on the same inputs
6. **Prediction history** — session log of all predictions with task, result, model, and timestamp
7. **Model metrics sidebar** — live test-set metrics table (R², MAE, RMSE for regression; F1, AUC, Accuracy for classification) with best model highlighted

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
