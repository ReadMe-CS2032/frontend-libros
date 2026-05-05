import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "avatar"}
        className={cn(
          "rounded-full object-cover ring-1 ring-border flex-shrink-0",
          sizeClass,
          className
        )}
      />
    );
  }

  const initials = name ? getInitials(name) : "?";

  return (
    <span
      aria-label={name ?? "avatar"}
      className={cn(
        "inline-flex items-center justify-center rounded-full flex-shrink-0",
        "bg-gradient-to-br from-violet-500 to-purple-600",
        "text-white font-semibold select-none ring-1 ring-violet-200",
        sizeClass,
        className
      )}
    >
      {initials}
    </span>
  );
}
