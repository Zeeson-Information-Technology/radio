import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['fluent-ffmpeg', 'cloudinary'],
  // For App Router, we need to handle large uploads differently
  // The body size limit is handled at the runtime level
};

export default nextConfig;
