import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "green" | "blue" | "amber" | "purple";
  className?: string;
}

const ACCENT_STYLES = {
  green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-700",  bar: "bg-green-500" },
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-700",    bar: "bg-blue-500"  },
  amber:  { bg: "bg-amber-50",  icon: "bg-amber-100 text-amber-700",  bar: "bg-amber-500" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-700",bar: "bg-purple-500"},
} as const;

export function StatsCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  accent = "green",
  className,
}: StatsCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className={cn("card p-5 relative overflow-hidden group hover:shadow-md transition-shadow", className)}>
      {/* 왼쪽 컬러 바 */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", styles.bar)} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
          {trend && (
            <p className={cn(
              "mt-2 text-xs font-medium",
              trend.positive ? "text-green-600" : "text-red-500"
            )}>
              {trend.positive ? "▲" : "▼"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-4", styles.icon)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
