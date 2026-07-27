"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type ScrollRevealProps = {
  children: ReactNode;
  delayMs?: number;
  direction?: "left" | "right" | "up";
  className?: string;
};

/**
 * DS Inventek scroll-reveal pattern, shared across the product family:
 * 20–28px travel, opacity fade, 450–550ms ease-out, triggers once per
 * section (no re-trigger on scroll-back), fully disabled under
 * prefers-reduced-motion. Use `delayMs` around 120–150 on the text group
 * that follows an image so it staggers in after it.
 */
export function ScrollReveal({
  children,
  delayMs = 0,
  direction = "up",
  className,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  const offset = {
    left: { x: -24, y: 0 },
    right: { x: 24, y: 0 },
    up: { x: 0, y: 24 },
  }[direction];

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.5,
        delay: delayMs / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
