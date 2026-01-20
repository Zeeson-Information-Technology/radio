import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // External packages for server components
    serverComponentsExternalPackages: ['fluent-ffmpeg'],
  },
  // For App Router, we need to handle large uploads differently
  // The body size limit is handled at the runtime level
};

export default nextConfig;
