/**
 * KPI Card Premium - Sparkline, comparaison période précédente, tendance 7j/30j
 */
import React from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";
import Card from "../ui/Card";
import { formatPercent } from "../../utils/formatters";

interface KPICardWithSparklineProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg?: string;
  /** Données pour la mini courbe (ex: trendLast7Days résolus) */
  sparklineData?: number[];
  /** Libellé période précédente (ex: "vs mois dernier") */
  previousLabel?: string;
  /** Valeur période précédente pour afficher la variation */
  previousValue?: number;
  /** Tendance 7j: variation en % ou texte */
  trend7d?: string;
  /** Tendance 30j */
  trend30d?: string;
  /** Couleur de la courbe (primary, success, warning, error) */
  chartColor?: string;
  status?: "success" | "warning" | "error" | "neutral";
  className?: string;
}

const chartColorMap: Record<string, string> = {
  primary: "var(--tw-color-primary, #1F5E76)",
  success: "var(--tw-color-success, #10B981)",
  warning: "var(--tw-color-warning, #F59E0B)",
  error: "var(--tw-color-error, #EF4444)",
  accent: "var(--tw-color-accent, #F97316)",
};

const KPICardWithSparkline: React.FC<KPICardWithSparklineProps> = ({
  title,
  value,
  icon,
  iconBg = "bg-primary/10 text-primary dark:bg-primary/30 dark:text-white",
  sparklineData = [],
  previousLabel = "vs période préc.",
  previousValue,
  trend7d,
  trend30d,
  chartColor = "primary",
  status,
  className = "",
}) => {
  const strokeColor = chartColorMap[chartColor] || chartColorMap.primary;
  const data = sparklineData.map((v, i) => ({ name: `${i}`, value: v }));
  const hasSparkline = data.length > 0 && data.some((d) => d.value > 0);

  const pctChange =
    previousValue != null && previousValue !== 0 && typeof value === "number"
      ? (((value as number) - previousValue) / previousValue) * 100
      : null;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className={className}>
      <Card padding="md" className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ds-muted">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-ds-primary mt-1 tabular-nums">
              {value}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
              {pctChange != null && (
                <span
                  className={
                    pctChange >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {formatPercent(pctChange, { signed: true })} {previousLabel}
                </span>
              )}
              {trend7d != null && <span className="text-ds-muted">7j: {trend7d}</span>}
              {trend30d != null && <span className="text-ds-muted">30j: {trend30d}</span>}
            </div>
            {hasSparkline && (
              <div className="h-10 w-full mt-2 -mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient
                        id={`spark-${title.replace(/\s/g, "")}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        fontSize: "11px",
                        borderRadius: "8px",
                        border: "1px solid var(--ds-border)",
                      }}
                      formatter={(v: number | undefined) => [v ?? 0, "Valeur"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      fill={`url(#spark-${title.replace(/\s/g, "")})`}
                      isAnimationActive={true}
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {status && (
              <span
                className={`w-2 h-2 rounded-full ${
                  status === "success"
                    ? "bg-success"
                    : status === "warning"
                      ? "bg-warning"
                      : status === "error"
                        ? "bg-error"
                        : "bg-slate-400"
                }`}
                title={status}
              />
            )}
            <div className={`rounded-2xl border border-slate-200 p-3 shadow-sm ${iconBg}`}>
              {icon}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default KPICardWithSparkline;
