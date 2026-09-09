import type { NextConfig } from "next";

// Sicherheits-Header (Konzept Abschnitt 7/9). HSTS setzt Caddy in Produktion,
// hier die anwendungsnahen Header inkl. einer bewusst engen CSP.
const csp = [
  "default-src 'self'",
  // Next.js Dev/Prod braucht inline-Runtime; 'unsafe-inline' fuer Styles (Tailwind-CDN wird nicht genutzt)
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  // Kunden-Logos koennen von beliebigen HTTPS-Quellen kommen (branding_logo_url)
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
