"use client";
import { motion } from "framer-motion";

interface Props {
  data: Record<string, Record<string, number>>;
  highlightCol: string;
  higherBetter?: boolean;
}

export function MetricsTable({ data, highlightCol, higherBetter = true }: Props) {
  const models = Object.keys(data);
  if (models.length === 0) return null;
  const cols = Object.keys(data[models[0]]);

  const bestVal = higherBetter
    ? Math.max(...models.map((m) => data[m][highlightCol]))
    : Math.min(...models.map((m) => data[m][highlightCol]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 font-semibold text-slate-400">Model</th>
            {cols.map((c) => (
              <th key={c} className="text-right py-2 px-3 font-semibold text-slate-400">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((model, i) => {
            const isBest = data[model][highlightCol] === bestVal;
            return (
              <motion.tr
                key={model}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border-t border-white/5 ${isBest ? "bg-indigo-500/10" : "hover:bg-white/[0.02]"} transition-colors`}
              >
                <td className="py-2 px-3 font-medium text-slate-300">
                  {isBest && <span className="text-emerald-400 mr-1">★</span>}
                  {model}
                </td>
                {cols.map((c) => (
                  <td key={c} className={`text-right py-2 px-3 tabular-nums ${isBest && c === highlightCol ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                    {data[model][c].toFixed(3)}
                  </td>
                ))}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
