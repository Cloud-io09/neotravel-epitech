import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const clientRoutes = [
      "demande",
      "devis",
      "partenaires",
      "contact",
      "notre-equipe",
      "mentions-legales",
      "confidentialite",
    ];

    return [
      { source: "/client", destination: "/", permanent: false },
      { source: "/connexion", destination: "/", permanent: false },
      { source: "/client/connexion", destination: "/", permanent: false },
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
