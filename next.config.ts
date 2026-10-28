/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  // La carte à partager lit la police Poppins sur le disque : on l'inclut dans la fonction Vercel.
  outputFileTracingIncludes: {
    '/api/share/card': ['./assets/fonts/**', './assets/logo/**'],
  },
  // En-têtes de sécurité : l'application ne peut pas être affichée dans le cadre d'un autre site
  // (anti « faux bouton » / clickjacking), le navigateur ne devine pas le type des fichiers, et
  // l'adresse complète des pages n'est pas transmise aux sites extérieurs.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
