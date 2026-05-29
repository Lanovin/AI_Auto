/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),

  // fs.readFile paths built from dynamic strings are invisible to Vercel's
  // static file tracer. Explicitly include every legacy file that route.js
  // reads at runtime so they are bundled into the serverless function.
  outputFileTracingIncludes: {
    '/legacy/[page]': [
      './ceny.html',
      './market-monitor.html',
      './popisky.html',
      './profil.html',
      './skaut.html',
    ],
    '/legacy-assets/[asset]': [
      './app.js',
      './popisky.js',
      './shared.js',
      './style.css',
    ],
  },

  async redirects() {
    return [
      {
        source: '/pro-lidi',
        destination: '/odhad-ceny',
        permanent: true
      },
      {
        source: '/pro-bazary',
        destination: '/profil?mode=dealer',
        permanent: true
      },
      {
        source: '/bazary',
        destination: '/profil?mode=dealer',
        permanent: true
      }
    ];
  }
};

export default nextConfig;