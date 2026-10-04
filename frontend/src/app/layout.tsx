import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4, Playfair_Display, EB_Garamond, Roboto, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import SiteTracker from "@/components/SiteTracker";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});
// Playfair Display — the serif brand wordmark (first name, from profile.name)
// in Nav/Footer, used directly via var(--font-playfair). NOT the h1 heading face (that's Inter).
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});
// Inter grotesque — bound to --font-display, the heading + hero wordmark face
// (Helvetica-grotesque feel). This is what h1 and HeroName actually render.
const inter = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const SITE_URL = "https://taruni-portfolio.vercel.app";
const SITE_TITLE = "Taruni Nallamothu — AI/ML Engineer & Data Engineer";
const SITE_DESC =
  "AI/ML Engineer & Data Engineer specializing in Generative AI, RAG, agentic AI systems, and scalable data pipelines on Azure. Google & Microsoft Certified.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Taruni Nallamothu",
  },
  description: SITE_DESC,
  authors: [{ name: "Taruni Nallamothu", url: SITE_URL }],
  creator: "Taruni Nallamothu",
  keywords: [
    "Data Engineer", "Taruni Nallamothu", "Machine Learning Engineer",
    "ETL Pipelines", "Azure", "Google Cloud Platform", "Power BI",
    "Data Science", "Predictive Modelling", "Python", "SQL",
    "Data Warehousing", "Cloud Analytics",
  ],
  alternates: {
    canonical: SITE_URL,
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: "Taruni Nallamothu",
    locale: "en_US",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Taruni N.", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    // Match the actual --bg tokens so the browser chrome blends with the page.
    { media: "(prefers-color-scheme: light)", color: "#fefefb" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${playfair.variable} ${ebGaramond.variable} ${roboto.variable} ${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Anti-FOUC: apply data-theme + dark class before first paint so bg never flashes white */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('color-theme')||'midnight';document.documentElement.setAttribute('data-theme',t);var d=localStorage.getItem('theme');if(!d||d==='dark'||(d==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <ThemeProvider>
          <SiteTracker />
          <PWARegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
