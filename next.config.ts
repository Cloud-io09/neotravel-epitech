import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const clientRoutes = [
      "demande",
      "devis",
      "connexion",
      "partenaires",
      "contact",
      "notre-equipe",
      "mentions-legales",
      "confidentialite",
    ];

    return [
      ...clientRoutes.map((route) => ({
        source: `/${route}`,
        destination: `/client/${route}`,
        permanent: false,
      })),
      ...clientRoutes.map((route) => ({
        source: `/${route}/:path*`,
        destination: `/client/${route}/:path*`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
