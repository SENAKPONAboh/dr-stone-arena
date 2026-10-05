/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  // La carte à partager lit la police Poppins sur le disque : on l'inclut dans la fonction Vercel.
  outputFileTracingIncludes: {
    '/api/share/card': ['./assets/fonts/**', './assets/logo/**'],
  },
};

export default nextConfig;
