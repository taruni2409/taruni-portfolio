"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { getOrCreateVisitorId } from "@/lib/visitor";

// Fires on every route change (hard load + client-side navigation).
// Sends x-visitor-id so the backend counts devices, not shared IPs.
// Server applies 10-min per-(visitor, page) dedup — safe to call on every navigation.
export default function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const vid = getOrCreateVisitorId();
    fetch(`${API_BASE_URL}/stats/visit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(vid ? { "x-visitor-id": vid } : {}),
      },
      body: JSON.stringify({ page: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
