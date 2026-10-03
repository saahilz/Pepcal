import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow local browser smoke checks via the loopback address. */
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
