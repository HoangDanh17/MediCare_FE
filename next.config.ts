import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker image chỉ copy .next/standalone + static + public.
  output: "standalone",
};

export default nextConfig;
