/** @type {import('next').NextConfig} */

// Bezpečnostní hlavičky pro celý web. Legacy nástroje běží ve stejnojmenném
// iframe (/legacy/*), proto frame-ancestors 'self' — cizí weby nás vložit nesmí.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.stripe.com")' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,

  // fs.readFile paths built from dynamic strings are invisible to Vercel's
  // static file tracer. Explicitly include every legacy file that route.js
  // reads at runtime so they are bundled into the serverless function.
  outputFileTracingIncludes: {
    '/legacy/[page]': [
      './market-monitor.html',
      './popisky.html',
      './profil.html',
      './skaut.html',
    ],
    '/legacy-assets/[asset]': [
      './popisky.js',
      './shared.js',
      './style.css',
    ],
  },

  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },

  async redirects() {
    return [
      { source: '/pro-lidi', destination: '/odhad-ceny', permanent: true },
      { source: '/pro-bazary', destination: '/registrace?type=dealer', permanent: true },
      { source: '/bazary', destination: '/registrace?type=dealer', permanent: true },
      // Jeden ceník: /predplatne bylo duplicitní stránkou s balíčky.
      { source: '/predplatne', destination: '/cenik', permanent: true },
    ];
  }
};

export default nextConfig;
