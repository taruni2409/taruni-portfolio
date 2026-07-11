"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { Suspense } from "react";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Google denied access: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from Google.");
      return;
    }

    const token = typeof window !== "undefined"
      ? localStorage.getItem("pumpkin_admin_token") ?? ""
      : "";
    const redirectUri = `${window.location.origin}/admin/google-callback`;

    fetch(`${API_BASE_URL}/admin/google-auth/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setMessage("Google account connected! You can close this window.");
          // Auto-close popup after 2 seconds
          setTimeout(() => {
            try { window.close(); } catch { /* standalone tab — just leave it */ }
          }, 2000);
        } else {
          const err = await res.json().catch(() => ({})) as { detail?: string };
          setStatus("error");
          setMessage(err.detail ?? `Server error ${res.status}`);
        }
      })
      .catch((e: unknown) => {
        setStatus("error");
        setMessage((e as Error).message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="rounded-2xl border border-border bg-surface p-8 max-w-sm w-full text-center shadow-lg">
        {status === "loading" && (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-fg">Completing sign-in…</p>
            <p className="text-xs text-fg-faint mt-1">Exchanging token with Google</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-fg">Google account connected!</p>
            <p className="text-xs text-fg-faint mt-1">{message}</p>
            <p className="text-[11px] text-fg-faint mt-3">Closing in 2 seconds…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-fg">Connection failed</p>
            <p className="text-xs text-fg-faint mt-1">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 text-xs text-accent hover:underline"
            >
              Close this window
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
