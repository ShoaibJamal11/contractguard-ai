import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Treat pdf-parse as a server-side external so Turbopack never tries to
  // bundle this CJS-only package — it is required at runtime via Node.js directly.
  serverExternalPackages: ['pdf-parse'],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
