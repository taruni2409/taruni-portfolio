import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export removed: the lightweight Pumpkin chat widget needs server-side
  // Route Handlers (to call Gemini with the API key kept out of the client bundle),
  // which a fully static export can't ship. Vercel runs this as a normal hybrid
  // Next.js app instead — pages stay statically optimized where possible, and the
  // API routes under /ai/* and /health become serverless functions.
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.1.166"],
};

export default nextConfig;
