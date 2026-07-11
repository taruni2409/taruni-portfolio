/** Returns a stable per-device UUID stored in localStorage (key: "jaya_vid").
 *  Used by SiteTracker and ChatInterface so site-visit and chat stats both
 *  count devices individually, not shared-IP networks.
 */
export function getOrCreateVisitorId(): string {
  try {
    const key = "jaya_vid";
    let id = localStorage.getItem(key);
    if (!id) {
      id =
        (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}
