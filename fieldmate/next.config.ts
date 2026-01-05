import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*"],
  output: "standalone", // For Docker deployment
};

export default nextConfig;
