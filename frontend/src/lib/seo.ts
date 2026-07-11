/** Portfolio SEO helpers — canonical URLs + JSON-LD structured-data builders.
 *  (Person/BlogPosting schemas live in their pages; this adds the sitewide WebSite
 *  entity and per-section breadcrumbs.) */

export const SITE_URL = "https://jayaremala.com";

/** Match the existing canonical convention: home keeps a trailing slash, section
 *  pages do not (e.g. https://jayaremala.com/experience). */
export function siteUrl(path: string): string {
  const clean = path.replace(/\/+$/, "");
  return clean === "" ? `${SITE_URL}/` : `${SITE_URL}${clean}`;
}

export function breadcrumbLd(path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: siteUrl(path) },
    ],
  };
}

/** Sitewide WebSite entity + sitelinks search box (the /?q= target is handled by
 *  SearchModal, which opens the command palette pre-filled with the query). */
export function webSiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Taruni Nallamothu",
    alternateName: "jayaremala.com",
    url: `${SITE_URL}/`,
    inLanguage: "en",
    publisher: { "@type": "Person", name: "Taruni Nallamothu", url: `${SITE_URL}/` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}
