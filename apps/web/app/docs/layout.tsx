import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — DS SimBoard",
  description: "How to use the simulator: pick a part, wire it up, and watch it work.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
