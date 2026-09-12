import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env["ANALYZE"] === "true",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevents clickjacking by blocking all framing of this site.
          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          // Enforces HTTPS for 2 years with subdomains; eligible for browser preload list.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // Stops browsers from MIME-sniffing the content-type, preventing XSS via type confusion.
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // Sends the origin on cross-origin requests but full URL on same-origin; balances analytics with privacy.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // Restricts which browser features (camera, mic, geolocation, etc.) this site can access.
          // Omits deprecated/removed directives (interest-cohort, browsing-topics, ambient-light-sensor).
          // Keeps fullscreen=(self) for embedded video players.
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "accelerometer=()",
              "autoplay=()",
              "payment=()",
              "usb=()",
              "hid=()",
              "serial=()",
              "bluetooth=()",
              "midi=()",
              "screen-wake-lock=()",
              "xr-spatial-tracking=()",
              "display-capture=()",
              "idle-detection=()",
              "picture-in-picture=()",
              "publickey-credentials-create=()",
              "publickey-credentials-get=()",
              "speaker-selection=()",
              "storage-access=()",
              "window-management=()",
              "local-fonts=()",
              "fullscreen=(self)",
            ].join(", "),
          },

          // Prevents other origins from embedding or reading resources from this origin.
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },

          // Isolates the browsing context; same-origin-allow-popups permits OAuth/payment popups.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },

          // Controls cross-origin resource loading; "credentialless" is less restrictive
          // than "require-corp" while still enabling SharedArrayBuffer if needed.
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },

          // Content-Security-Policy: defence-in-depth against XSS, data injection, and framing.
          // 'unsafe-inline' is needed for Next.js style injection in dev/prod.
          // No 'unsafe-eval', no wildcards.
          //
          // script-src 'unsafe-inline': Next.js emits inline <script> tags for the
          // bootstrap payload and streaming chunks. A nonce-based CSP would require
          // per-request header generation, which forces dynamic rendering and defeats
          // this site's static-generation performance strategy.
          // Revisit if the site ever adds authentication or renders user-generated content.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "media-src 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
