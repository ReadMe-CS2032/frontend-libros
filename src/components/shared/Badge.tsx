import { cn } from "@/lib/utils";
import { CONDITION_LABELS, CONDITION_COLORS, MODE_LABELS, MODE_COLORS } from "@/lib/utils";
import type { BookCondition, BookMode } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "violet" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  "bg-muted text-muted-foreground",
  success:  "bg-emerald-100 text-emerald-800",
  warning:  "bg-amber-100 text-amber-800",
  danger:   "bg-red-100 text-red-800",
  info:     "bg-sky-100 text-sky-800",
  violet:   "bg-violet-100 text-violet-800",
  outline:  "border border-border text-muted-foreground bg-transparent",
};

const SIZE_CLASSES = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-0.5",
};

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {children}
    </span>
  );
}

interface ConditionBadgeProps {
  condition: BookCondition;
  size?: "sm" | "md";
  className?: string;
}

export function ConditionBadge({ condition, size = "md", className }: ConditionBadgeProps) {
  if (!condition || !CONDITION_LABELS[condition]) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium leading-none whitespace-nowrap",
        CONDITION_COLORS[condition],
        SIZE_CLASSES[size],
        className
      )}
    >
      {CONDITION_LABELS[condition]}
    </span>
  );
}

interface ModeBadgeProps {
  mode: BookMode;
  size?: "sm" | "md";
  className?: string;
}

export function ModeBadge({ mode, size = "md", className }: ModeBadgeProps) {
  if (!mode || !MODE_LABELS[mode]) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium leading-none whitespace-nowrap",
        MODE_COLORS[mode],
        SIZE_CLASSES[size],
        className
      )}
    >
      {MODE_LABELS[mode]}
    </span>
  );
}
