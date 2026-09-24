import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework and never ship readable source to the browser.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,

  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },

  // Static security headers. The Content-Security-Policy (with a per-request
  // nonce) is added in src/proxy.ts because it has to change on every request.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
