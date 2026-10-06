import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { CONSENT_BOOT_HASH } from "./src/lib/consent-boot";
import { SPLASH_BOOT_HASH } from "./src/lib/splash-boot";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env["ANALYZE"] === "true",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    // WebP only. With AVIF first, `next start` on CI's Linux intermittently
    // hung encoding one photo's AVIF (hero/process/1.2.jpg at 640px) and never
    // answered it for the rest of the run: probed 2026-09-27 with the
    // browser's own Accept header, the server did not answer in 30s, while
    // other runs of the same commit were clean. Not reproducible on macOS.
    // Decided by Shivanshu: WebP until the cause is found. Production images
    // go through Vercel's optimizer, but this config decides the formats there
    // too. e2e/infra.spec.ts asserts it, so bringing AVIF back is deliberate.
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },

  async headers() {
    // The e2e suite serves plain HTTP on loopback. HSTS and
    // upgrade-insecure-requests both make WebKit refuse those assets, so they
    // are omitted for that run only — see the CSP note below. Never set this
    // variable outside the Playwright webServer command.
    const isE2E = Boolean(process.env["PLAYWRIGHT"]);

    // Content-Security-Policy: defence-in-depth against XSS, data injection, and framing.
    // 'unsafe-inline' is needed for Next.js style injection in dev/prod.
    // No wildcards. 'unsafe-eval' is dev-server only (see script-src below).
    //
    // script-src 'unsafe-inline': Next.js emits inline <script> tags for the
    // bootstrap payload and streaming chunks. A nonce-based CSP would require
    // per-request header generation, which forces dynamic rendering and defeats
    // this site's static-generation performance strategy. Accepted as a risk
    // (docs/launch-gate/accepted-risks.md), with the report-only twin below
    // measuring what removing it would break.
    // Revisit if the site ever adds authentication or renders user-generated content.
    //
    // One builder for both policies so they cannot drift: `strict` drops
    // 'unsafe-inline' from script-src and style-src, and allows our two boot
    // scripts (src/lib/consent-boot.ts, src/lib/splash-boot.ts) by their
    // hashes instead.
    //
    // The hash is in the STRICT policy only, and must stay out of the enforced
    // one: a policy that lists a hash makes browsers ignore its
    // 'unsafe-inline', which would block every inline script Next emits.
    const csp = (strict: boolean) =>
      [
        "default-src 'self'",
        // React's dev-only debugging (callstack reconstruction) requires
        // 'unsafe-eval'. Dev server only — never emitted in production.
        // 'wasm-unsafe-eval' is for the hero's Draco decoder
        // (public/draco/draco_decoder.wasm), which decompresses the
        // villa model's geometry. The villa glTF declares
        // KHR_draco_mesh_compression in `extensionsRequired`, so the
        // model cannot be read at all without it.
        //
        // NARROWER than it sounds, and not a step toward 'unsafe-eval':
        // it permits WebAssembly compilation ONLY, and still forbids
        // JavaScript string evaluation. The wasm is served from our own
        // origin under default-src 'self' — no CDN, no third-party
        // origin — so the only module that can be compiled is one we
        // ship.
        //
        // Reviewed against Security System §8 (headers): the directive
        // widens script execution, which is why it is stated here with
        // its reason rather than added quietly, and why the decoder is
        // self-hosted rather than pulled from a public CDN.
        //
        // React's dev-only debugging (callstack reconstruction) needs
        // full 'unsafe-eval'. Dev server only — never in production.
        `script-src 'self'${strict ? ` ${CONSENT_BOOT_HASH} ${SPLASH_BOOT_HASH}` : " 'unsafe-inline'"} 'wasm-unsafe-eval'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
        // DRACOLoader builds its decoder worker from a Blob, so the
        // worker's URL is blob: rather than a file on our origin.
        // Without this directive workers fall back to script-src, which
        // has no blob: source, and every decode fails.
        //
        // Scoped to workers alone: it does NOT allow blob: as a script
        // or frame source. The blob is assembled in our own code from
        // the decoder we ship, not from anything a user or third party
        // can influence.
        "worker-src 'self' blob:",
        `style-src 'self'${strict ? "" : " 'unsafe-inline'"}`,
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        // Omitted when PLAYWRIGHT is set, and only then. That server is plain
        // HTTP on loopback, and WebKit honours this directive there:
        // every script and stylesheet is upgraded to https, the handshake
        // fails, and the page never hydrates. Server Components still
        // render, so page-level assertions pass and the gap is silent —
        // any test of client behaviour checks a dead page.
        //
        // Chromium exempts loopback, which is why this only ever showed
        // up on the iPhone project. Production is unaffected: PLAYWRIGHT
        // is set by the e2e run, nothing else.
        // Meaningless in a report-only policy, which only observes.
        ...(isE2E || strict ? [] : ["upgrade-insecure-requests"]),
        // Both reporting mechanisms: report-to is the Reporting API
        // (Chromium, via the Reporting-Endpoints header above); report-uri
        // is what Firefox and Safari still send to. Same endpoint.
        "report-uri /api/csp-report",
        "report-to csp-endpoint",
      ].join("; ");

    // The public/ assets: the hero model and poster, the Draco decoder, the
    // logos and icons. A day, then a week of serving the cached copy while
    // it revalidates in the background (Performance System §8).
    //
    // Not `immutable`, which §8 reserves for fingerprinted files: these keep
    // their names when they change, so a year-long immutable cache would serve
    // a replaced villa.glb to returning visitors for a year. Next's own hashed
    // files under /_next/static are already immutable and cannot be changed.
    const publicAssetCache = {
      key: "Cache-Control",
      value: "public, max-age=86400, stale-while-revalidate=604800",
    };

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
          // max-age 0 under Playwright so a cached policy from an earlier run
          // cannot keep upgrading the plain-HTTP test server.
          {
            key: "Strict-Transport-Security",
            value: isE2E ? "max-age=0" : "max-age=63072000; includeSubDomains; preload",
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

          // Isolates the browsing context from cross-origin windows (Security
          // System §8). same-origin, not same-origin-allow-popups: the site
          // opens no popup that needs a handle back to it. Its external links
          // (WhatsApp, socials) open new tabs with rel="noopener", which needs
          // no opener either.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },

          // Controls cross-origin resource loading; "credentialless" is less restrictive
          // than "require-corp" while still enabling SharedArrayBuffer if needed.
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },

          // Where browsers send CSP violation reports (report-to csp-endpoint).
          // A relative URL resolves against the page, so previews report to
          // themselves. src/app/api/csp-report/route.ts receives them.
          {
            key: "Reporting-Endpoints",
            value: 'csp-endpoint="/api/csp-report"',
          },

          {
            key: "Content-Security-Policy",
            value: csp(false),
          },

          // Security System §8: report-only CSP on every build. The target
          // policy without 'unsafe-inline', observed rather than enforced, so
          // the reports say exactly what enforcing it would break.
          {
            key: "Content-Security-Policy-Report-Only",
            value: csp(true),
          },
        ],
      },
      { source: "/hero/:path*", headers: [publicAssetCache] },
      { source: "/draco/:path*", headers: [publicAssetCache] },
      { source: "/brand/:path*", headers: [publicAssetCache] },
      { source: "/icons/:path*", headers: [publicAssetCache] },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
