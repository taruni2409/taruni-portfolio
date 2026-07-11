"use client";

import { usePathname } from "next/navigation";

/*
 * Page transition — uses the native View Transitions API when available
 * (buttery cross-fade/morph), and falls back to a keyed CSS enter animation
 * everywhere else. Re-keys on pathname so each route animates in.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
