import Link from "next/link";
import { ComponentProps } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-glow to-emerald-glow text-base-950 font-semibold shadow-lg shadow-cyan-glow/20 hover:shadow-cyan-glow/40 hover:brightness-110",
  ghost:
    "glass text-slate-200 hover:bg-white/[0.08] hover:border-white/20",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow focus-visible:ring-offset-2 focus-visible:ring-offset-base-950";

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps & ComponentProps<"button">) {
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
