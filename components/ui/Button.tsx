import { ReactNode } from "react";
import clsx from "clsx";
import Link from "next/link";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-[15px] font-medium tracking-[0.01em] transition-colors duration-200 ease-out";

const variants = {
  primary: "bg-navy text-ivory hover:bg-navy-dark",
  secondary:
    "border border-charcoal/20 text-charcoal hover:border-charcoal/40 bg-transparent",
  ghost: "text-charcoal-muted hover:text-charcoal",
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className,
  type = "button",
}: ButtonProps) {
  const classes = clsx(base, variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
