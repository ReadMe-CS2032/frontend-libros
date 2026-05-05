import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16 gap-4",
        className
      )}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100 mb-1">
          <Icon className="w-6 h-6 text-violet-400" />
        </div>
      )}

      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
