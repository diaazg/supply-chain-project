"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, BarChart3, Cpu, History, ChevronDown,
  Sparkles, Truck, AlertCircle, X, Loader2,
} from "lucide-react";

import { fetchMeta, predict, Meta, PredictResponse } from "@/lib/api";
import { GlowOrb } from "@/components/GlowOrb";
import { KpiCard } from "@/components/KpiCard";
import { MetricsTable } from "@/components/MetricsTable";
import { FeatureChart } from "@/components/FeatureChart";
import { ResultCard } from "@/components/ResultCard";
import { ComparisonTable } from "@/components/ComparisonTable";

type Task = "ship" | "late";
type HistoryEntry = { task: string; result: string; model: string; ts: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none transition-colors"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, decimals = 0 }:
  { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; decimals?: number }) {
  const safe = isNaN(value) ? min : value;
  return (
    <input
      type="number"
      value={decimals > 0 ? safe.toFixed(decimals) : safe}
      onChange={(e) => {
        const parsed = parseFloat(e.target.value);
        onChange(isNaN(parsed) ? min : parsed);
      }}
      min={min} max={max} step={step}
      className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none transition-colors tabular-nums"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    />
  );
}

export default function Home() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task>("ship");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"ship" | "late">("ship");
  const resultRef = useRef<HTMLDivElement>(null);

  const [inputs, setInputs] = useState<Record<string, string | number>>({
    "Type": "DEBIT",
    "Days for shipment (scheduled)": 4,
    "Shipping Mode": "Standard Class",
    "Customer Segment": "Consumer",
    "Market": "Europe",
    "Order Item Quantity": 1,
    "Customer Country": "EE. UU.",
    "Order Country": "EE. UU.",
    "Order Region": "Western Europe",
    "Latitude": 39.5,
    "Longitude": -98.35,
    "Category Name": "",
    "order_year": new Date().getFullYear(),
    "order_month": new Date().getMonth() + 1,
    "order_day": new Date().getDate(),
    "order_dayofweek": new Date().getDay(),
    "order_hour": new Date().getHours(),
  });

  useEffect(() => {
    fetchMeta()
      .then((m) => {
        setMeta(m);
        setInputs((prev) => {
          const next = { ...prev };
          for (const [k, opts] of Object.entries(m.dropdown_options)) {
            if (!next[k] && opts.length > 0) next[k] = opts[0];
          }
          return next;
        });
      })
      .catch(() => setError("Cannot reach the API. Make sure the FastAPI server is running on port 8000."));
  }, []);

  const set = (key: string, val: string | number) =>
    setInputs((prev) => ({ ...prev, [key]: val }));

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!meta) return;
    setLoading(true);
    setResult(null);
    setShowComparison(false);
    try {
      const res = await predict(task, inputs);
      setResult(res);
      setHistory((h) => [{
        task: task === "ship" ? "Shipment Duration" : "Late Delivery Risk",
        result: res.result.label,
        model: res.best_model,
        ts: new Date().toLocaleTimeString(),
      }, ...h.slice(0, 19)]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Prediction failed. Check the API server.");
    } finally {
      setLoading(false);
    }
  }

  if (!meta && !error) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
          <Loader2 size={40} className="text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  const opts = meta?.dropdown_options ?? {};
  const metricsShip = meta?.metrics_shipping ?? {};
  const metricsLate = meta?.metrics_late ?? {};
  const bestR2 = Object.keys(metricsShip).length
    ? Math.max(...Object.values(metricsShip).map((m) => (m as Record<string, number>)["R²"] ?? 0)).toFixed(3)
    : "—";
  const bestAUC = Object.keys(metricsLate).length
    ? Math.max(...Object.values(metricsLate).map((m) => (m as Record<string, number>)["AUC"] ?? 0)).toFixed(3)
    : "—";

  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      <GlowOrb className="w-[600px] h-[600px] -top-40 -left-32 bg-indigo-600" />
      <GlowOrb className="w-[500px] h-[500px] top-1/2 -right-40 bg-violet-600" />
      <GlowOrb className="w-[400px] h-[400px] bottom-0 left-1/3 bg-cyan-600" />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass px-5 py-3 flex items-center gap-3 text-sm text-red-300"
            style={{ borderColor: "rgba(239,68,68,0.35)" }}
          >
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-slate-400 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 hidden lg:flex flex-col border-r border-white/7 p-6 gap-6"
          style={{ background: "rgba(14,18,35,0.8)", backdropFilter: "blur(20px)" }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 pb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Package size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Supply Chain AI</p>
              <p className="text-xs text-slate-500">ML Prediction Suite</p>
            </div>
          </motion.div>

          <div className="flex-1 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <BarChart3 size={12} /> Model Performance
            </p>
            <div className="flex rounded-xl p-0.5 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {(["ship", "late"] as const).map((t) => (
                <button key={t} onClick={() => setSidebarTab(t)}
                  className={`flex-1 text-xs py-1.5 rounded-[10px] font-medium transition-all ${sidebarTab === t ? "text-white" : "text-slate-400 hover:text-slate-300"}`}
                  style={sidebarTab === t ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}>
                  {t === "ship" ? "🚚 Duration" : "⚠️ Late Risk"}
                </button>
              ))}
            </div>
            {sidebarTab === "ship" && Object.keys(metricsShip).length > 0 && (
              <MetricsTable data={metricsShip} highlightCol="R²" higherBetter />
            )}
            {sidebarTab === "late" && Object.keys(metricsLate).length > 0 && (
              <MetricsTable data={metricsLate} highlightCol="AUC" higherBetter />
            )}
          </div>

          <p className="text-xs text-slate-600 text-center border-t border-white/5 pt-4">
            Random Forest · XGBoost · LightGBM
          </p>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", color: "#a5b4fc" }}
              >
                <Sparkles size={12} /> AI-Powered Supply Chain Intelligence
              </motion.span>
              <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-tight gradient-text">
                Supply Chain<br />Predictor
              </h1>
              <p className="text-slate-400 mt-3 text-lg max-w-xl">
                Predict shipment duration and late delivery risk with ensemble ML models.
              </p>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Models" value="4" Icon={Cpu} delay={0.1} color="#6366f1" />
              <KpiCard label="Best R²" value={bestR2} Icon={BarChart3} delay={0.15} color="#8b5cf6" />
              <KpiCard label="Best AUC" value={bestAUC} Icon={BarChart3} delay={0.2} color="#06b6d4" />
              <KpiCard label="Predictions" value={String(history.length)} Icon={Sparkles} delay={0.25} color="#10b981" />
            </div>

            {/* Task selector */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Prediction Task</p>
              <div className="flex gap-3">
                {([
                  { key: "ship" as Task, label: "Shipment Duration", Icon: Truck, desc: "Predict real shipping days" },
                  { key: "late" as Task, label: "Late Delivery Risk", Icon: AlertCircle, desc: "Classify on-time vs late" },
                ]).map(({ key, label, Icon, desc }) => (
                  <button key={key} onClick={() => { setTask(key); setResult(null); }}
                    className={`flex-1 glass p-4 text-left transition-all duration-200 rounded-2xl ${task === key ? "ring-2 ring-indigo-500" : "hover:border-indigo-500/50"}`}
                    style={task === key ? { background: "rgba(99,102,241,0.12)" } : {}}>
                    <Icon size={18} className={`mb-2 ${task === key ? "text-indigo-400" : "text-slate-500"}`} />
                    <p className={`text-sm font-semibold ${task === key ? "text-white" : "text-slate-300"}`}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Form */}
            {meta && (
              <motion.form onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="glass p-6 space-y-6">
                <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Package size={15} className="text-indigo-400" /> Order Details
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Payment Type">
                    <Select value={String(inputs["Type"])} onChange={(v) => set("Type", v)}
                      options={opts["Type"] ?? ["DEBIT","TRANSFER","CASH","PAYMENT"]} />
                  </Field>
                  <Field label="Scheduled Shipping Days">
                    <NumberInput value={Number(inputs["Days for shipment (scheduled)"])}
                      onChange={(v) => set("Days for shipment (scheduled)", v)} min={0} max={10} />
                  </Field>
                  <Field label="Shipping Mode">
                    <Select value={String(inputs["Shipping Mode"])} onChange={(v) => set("Shipping Mode", v)}
                      options={opts["Shipping Mode"] ?? ["Standard Class","Second Class","First Class","Same Day"]} />
                  </Field>
                  <Field label="Customer Segment">
                    <Select value={String(inputs["Customer Segment"])} onChange={(v) => set("Customer Segment", v)}
                      options={opts["Customer Segment"] ?? ["Consumer","Corporate","Home Office"]} />
                  </Field>
                  <Field label="Market">
                    <Select value={String(inputs["Market"])} onChange={(v) => set("Market", v)}
                      options={opts["Market"] ?? ["Europe","LATAM","US","Pacific Asia","Africa"]} />
                  </Field>
                  <Field label="Order Item Quantity">
                    <NumberInput value={Number(inputs["Order Item Quantity"])}
                      onChange={(v) => set("Order Item Quantity", v)} min={1} max={5} />
                  </Field>
                  <Field label="Customer Country">
                    <Select value={String(inputs["Customer Country"])} onChange={(v) => set("Customer Country", v)}
                      options={opts["Customer Country"] ?? ["EE. UU."]} />
                  </Field>
                  <Field label="Order Country">
                    <Select value={String(inputs["Order Country"])} onChange={(v) => set("Order Country", v)}
                      options={opts["Order Country"] ?? ["EE. UU."]} />
                  </Field>
                  <Field label="Order Region">
                    <Select value={String(inputs["Order Region"])} onChange={(v) => set("Order Region", v)}
                      options={opts["Order Region"] ?? ["Western Europe"]} />
                  </Field>
                  {task === "late" && (
                    <Field label="Product Category">
                      <Select value={String(inputs["Category Name"])} onChange={(v) => set("Category Name", v)}
                        options={opts["Category Name"] ?? []} />
                    </Field>
                  )}
                  <Field label="Latitude">
                    <NumberInput value={Number(inputs["Latitude"])} onChange={(v) => set("Latitude", v)}
                      min={-90} max={90} step={0.0001} decimals={4} />
                  </Field>
                  <Field label="Longitude">
                    <NumberInput value={Number(inputs["Longitude"])} onChange={(v) => set("Longitude", v)}
                      min={-180} max={180} step={0.0001} decimals={4} />
                  </Field>
                </div>

                {task === "late" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Order Date & Time</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                      {[
                        { k: "order_year", l: "Year", min: 2015, max: 2030 },
                        { k: "order_month", l: "Month", min: 1, max: 12 },
                        { k: "order_day", l: "Day", min: 1, max: 31 },
                        { k: "order_dayofweek", l: "Day of Week (0=Mon)", min: 0, max: 6 },
                        { k: "order_hour", l: "Hour", min: 0, max: 23 },
                      ].map(({ k, l, min, max }) => (
                        <Field key={k} label={l}>
                          <NumberInput value={Number(inputs[k])} onChange={(v) => set(k, v)} min={min} max={max} />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  {loading ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}>
                        <Loader2 size={16} />
                      </motion.div>
                      Predicting…
                    </>
                  ) : (
                    <><Sparkles size={16} /> Run Prediction</>
                  )}
                </motion.button>
              </motion.form>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div ref={resultRef} key="results"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Prediction Result</p>
                      <ResultCard result={result} />
                    </div>
                    <div className="glass p-5 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Top Feature Drivers</p>
                      <FeatureChart data={result.importances} />
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="glass overflow-hidden">
                    <button onClick={() => setShowComparison((s) => !s)}
                      className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                      <span className="flex items-center gap-2">
                        <Cpu size={15} className="text-indigo-400" /> Compare All Models
                      </span>
                      <motion.div animate={{ rotate: showComparison ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {showComparison && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                          className="overflow-hidden border-t border-white/7">
                          <div className="p-5 pt-3">
                            <ComparisonTable rows={result.comparison} task={task} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History */}
            {history.length > 0 && (
              <div className="glass overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowHistory((s) => !s)}
                  onKeyDown={(e) => e.key === "Enter" && setShowHistory((s) => !s)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <History size={15} className="text-indigo-400" /> Prediction History
                    <span className="text-xs font-normal text-slate-500">({history.length})</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); setHistory([]); }}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
                    <motion.div animate={{ rotate: showHistory ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={16} />
                    </motion.div>
                  </div>
                </div>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-white/7">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/8">
                              {["Task", "Result", "Model", "Time"].map((h) => (
                                <th key={h} className="text-left py-3 px-5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {history.map((h, i) => (
                              <motion.tr key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-5 text-slate-300">{h.task}</td>
                                <td className="py-2.5 px-5 font-semibold text-indigo-300">{h.result}</td>
                                <td className="py-2.5 px-5 text-slate-400">{h.model}</td>
                                <td className="py-2.5 px-5 text-slate-500 tabular-nums">{h.ts}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
