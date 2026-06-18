import { LogCategory } from "@/types/classifier";
import { cn } from "@/lib/utils";

const categoryConfig: Record<LogCategory, { label: string; classes: string }> = {
  SECURITY_ALERT: {
    label: "Security Alert",
    classes: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  RESOURCE_USAGE: {
    label: "Resource Usage",
    classes: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  WORKFLOW_ERROR: {
    label: "Workflow Error",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  SYSTEM_EVENT: {
    label: "System Event",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  UNKNOWN: {
    label: "Unknown",
    classes: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
};

interface CategoryBadgeProps {
  category: LogCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = categoryConfig[category];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}