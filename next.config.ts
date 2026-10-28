import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.csv": {
        loaders: ["file-loader"],
        as: "*.csv",
      },
    },
  },
};

export default nextConfig;
