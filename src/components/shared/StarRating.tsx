import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;     
  max?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

const SIZE = {
  sm: { star: 12, gap: "gap-0.5", text: "text-xs" },
  md: { star: 16, gap: "gap-1",   text: "text-sm" },
};

export default function StarRating({
  value,
  max = 5,
  size = "sm",
  showValue = false,
  className,
}: StarRatingProps) {
  const { star, gap, text } = SIZE[size];
  const clamped = Math.max(0, Math.min(value, max));

  return (
    <span className={cn("inline-flex items-center", gap, className)}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return <Star key={i} fill={fill} size={star} />;
      })}
      {showValue && (
        <span className={cn("ml-0.5 font-medium text-foreground tabular-nums", text)}>
          {clamped.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `sf-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
          <stop offset={`${fill * 100}%`} stopColor="#d1d5db" />
        </linearGradient>
      </defs>
      <path
        d="M8 1.5l1.85 3.75 4.15.6-3 2.93.71 4.13L8 10.77l-3.71 1.94.71-4.13-3-2.93 4.15-.6L8 1.5z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}
