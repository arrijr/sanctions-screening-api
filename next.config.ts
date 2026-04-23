import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/v1/screen": ["./src/data/sanctions.json"],
    "/api/v1/screen/batch": ["./src/data/sanctions.json"],
  },
};

export default nextConfig;
