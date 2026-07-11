"use client";
import { useEffect } from "react";

export default function MobileNoBg() {
  useEffect(() => {
    document.body.classList.add("mobile-no-bg");
    return () => document.body.classList.remove("mobile-no-bg");
  }, []);
  return null;
}
