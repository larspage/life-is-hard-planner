import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-style `cn()` helper. Concatenates class names with conditional
 * logic (via clsx) and resolves Tailwind class conflicts (via tailwind-merge)
 * so duplicate utility classes don't fight each other.
 *
 * Usage:
 *   <div className={cn("p-4", isActive && "bg-primary", className)} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
