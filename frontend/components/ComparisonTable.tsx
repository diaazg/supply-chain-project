"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ComparisonRow } from "@/lib/api";
import { Star } from "lucide-react";

export function ComparisonTable({ rows, task }: { rows: ComparisonRow[]; task: "ship" | "late" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Model</th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {task === "ship" ? "Predicted Days" : "Prediction"}
            </th>
            {task === "late" && (
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Confidence</th>
            )}
            <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Best</th>
          </tr>
        </thead>
        <AnimatePresence>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={row.model}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                className={`border-b border-white/5 ${row.best ? "bg-indigo-500/10" : "hover:bg-white/[0.02]"} transition-colors`}
              >
                <td className="py-3 px-4 font-medium text-slate-200">{row.model}</td>
                <td className="text-right py-3 px-4 tabular-nums text-slate-300">
                  {task === "ship" ? `${row.value?.toFixed(1)} days` : (
                    <span className={row.class === 1 ? "text-red-400" : "text-emerald-400"}>
                      {row.label}
                    </span>
                  )}
                </td>
                {task === "late" && (
                  <td className="text-right py-3 px-4 tabular-nums text-slate-400">
                    {((row.confidence ?? 0) * 100).toFixed(1)}%
                  </td>
                )}
                <td className="text-center py-3 px-4">
                  {row.best && <Star size={14} className="text-yellow-400 inline" fill="currentColor" />}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </AnimatePresence>
      </table>
    </div>
  );
}
