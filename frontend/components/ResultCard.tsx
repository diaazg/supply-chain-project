"use client";
import { motion } from "framer-motion";
import { PredictResponse } from "@/lib/api";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface Props {
  result: PredictResponse;
}

export function ResultCard({ result }: Props) {
  const { result: r, best_model } = result;
  const isLate = r.class === 1;

  if (r.type === "regression") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="glass p-8 flex flex-col items-center text-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))", borderColor: "rgba(16,185,129,0.3)" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}
        >
          <Clock size={26} className="text-emerald-400" />
        </motion.div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Predicted Shipment Duration</p>
        <div className="flex items-baseline gap-2">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-6xl font-black text-emerald-400"
          >
            {r.value?.toFixed(1)}
          </motion.span>
          <span className="text-2xl font-medium text-slate-400">days</span>
        </div>
        <p className="text-xs text-slate-500">
          Model: <span className="text-slate-300 font-semibold">{best_model}</span>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="glass p-8 flex flex-col items-center text-center gap-3"
      style={
        isLate
          ? { background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(139,92,246,0.06))", borderColor: "rgba(239,68,68,0.3)" }
          : { background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))", borderColor: "rgba(16,185,129,0.3)" }
      }
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={
          isLate
            ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }
            : { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }
        }
      >
        {isLate
          ? <AlertTriangle size={26} className="text-red-400" />
          : <CheckCircle2 size={26} className="text-emerald-400" />
        }
      </motion.div>

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Delivery Risk Assessment</p>

      <div className="flex items-center gap-3">
        <span
          className={`w-3 h-3 rounded-full ${isLate ? "bg-red-500 pulse-red" : "bg-emerald-500 pulse-green"}`}
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-4xl font-black ${isLate ? "text-red-400" : "text-emerald-400"}`}
        >
          {r.label}
        </motion.span>
      </div>

      {/* Confidence bar */}
      <div className="w-full mt-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Confidence</span>
          <span className="font-semibold text-slate-300">{((r.confidence ?? 0) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(r.confidence ?? 0) * 100}%` }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="h-full rounded-full"
            style={{ background: isLate ? "linear-gradient(90deg,#ef4444,#8b5cf6)" : "linear-gradient(90deg,#10b981,#06b6d4)" }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Model: <span className="text-slate-300 font-semibold">{best_model}</span>
      </p>
    </motion.div>
  );
}
