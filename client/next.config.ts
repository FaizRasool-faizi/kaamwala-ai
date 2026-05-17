import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/register", destination: "/expert/register", permanent: false },
      { source: "/login", destination: "/expert/login", permanent: false },
      { source: "/dashboard", destination: "/expert/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
