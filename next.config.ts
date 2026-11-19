import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl) : null;
const isLocalSupabase = supabaseHost ? ["localhost", "127.0.0.1"].includes(supabaseHost.hostname) : false;

const nextConfig: NextConfig = {
  // The site is almost entirely live data (stock, prices, dashboard), so it uses
  // request-time rendering (the documented "previous" caching model) rather than
  // Cache Components.
  poweredByHeader: false,
  images: {
    // Local Supabase (development/testing) serves images from 127.0.0.1, which the
    // optimiser refuses by default; production uses *.supabase.co.
    unoptimized: isLocalSupabase,
    qualities: [75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabaseHost && !isLocalSupabase
        ? [{ protocol: supabaseHost.protocol.replace(":", "") as "http" | "https", hostname: supabaseHost.hostname, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
