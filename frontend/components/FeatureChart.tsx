"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { FeatureImportance } from "@/lib/api";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: FeatureImportance }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="text-slate-300 font-medium">{payload[0].payload.feature}</p>
      <p className="text-indigo-400 font-bold">{payload[0].value.toFixed(4)}</p>
    </div>
  );
};

export function FeatureChart({ data }: { data: FeatureImportance[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const sorted = [...data].sort((a, b) => a.importance - b.importance);
  const max = sorted[sorted.length - 1]?.importance ?? 1;

  if (!mounted) {
    return <div className="h-72 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <ResponsiveContainer width="100%" height={288}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <XAxis
            type="number"
            domain={[0, max]}
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={140}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
          <Bar
            dataKey="importance"
            maxBarSize={14}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
              const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
              const color = index === sorted.length - 1 ? "#06b6d4" : index >= sorted.length - 3 ? "#8b5cf6" : "#6366f1";
              const opacity = 0.7 + (index / sorted.length) * 0.3;
              return <rect x={x} y={y} width={Math.max(0, width)} height={Math.max(0, height)} fill={color} fillOpacity={opacity} rx={4} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
