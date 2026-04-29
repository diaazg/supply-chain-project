const BASE = "http://localhost:8000";

export interface Meta {
  dropdown_options: Record<string, string[]>;
  features_shipping: string[];
  features_late: string[];
  model_names: string[];
  best_model_shipping: string;
  best_model_late: string;
  metrics_shipping: Record<string, Record<string, number>>;
  metrics_late: Record<string, Record<string, number>>;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ComparisonRow {
  model: string;
  value?: number;
  label: string;
  class?: number;
  confidence?: number;
  best: boolean;
}

export interface PredictResponse {
  result: {
    type: "regression" | "classification";
    value?: number;
    label: string;
    class?: number;
    confidence?: number;
  };
  best_model: string;
  importances: FeatureImportance[];
  comparison: ComparisonRow[];
}

export async function fetchMeta(): Promise<Meta> {
  const res = await fetch(`${BASE}/meta`);
  if (!res.ok) throw new Error("Failed to load metadata");
  return res.json();
}

export async function predict(task: "ship" | "late", inputs: Record<string, unknown>): Promise<PredictResponse> {
  const res = await fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, inputs }),
  });
  if (!res.ok) throw new Error("Prediction failed");
  return res.json();
}
