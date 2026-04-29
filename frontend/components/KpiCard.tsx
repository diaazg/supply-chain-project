"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  Icon: LucideIcon;
  delay?: number;
  color?: string;
}

export function KpiCard({ label, value, Icon, delay = 0, color = "#6366f1" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass p-5 flex items-center gap-4 cursor-default"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5 gradient-text">{value}</p>
      </div>
    </motion.div>
  );
}
