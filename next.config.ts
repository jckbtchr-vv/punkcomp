import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "dweb.link" },
      { protocol: "https", hostname: "*.ipfs.w3s.link" },
      { protocol: "https", hostname: "w3s.link" },
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
};

export default nextConfig;
