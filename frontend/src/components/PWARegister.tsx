"use client";

import { useEffect } from "react";

/**
 * Registers the portfolio service worker (/sw.js, root scope) so the site is
 * installable as a PWA. Skipped on localhost (so dev HMR isn't shadowed).
 */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Non-fatal: the install prompt simply won't be offered. */
    });
  }, []);

  return null;
}
