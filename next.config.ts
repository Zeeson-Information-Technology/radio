import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled by Next.js (server-side only)
  serverExternalPackages: ['fluent-ffmpeg', 'cloudinary'],
};

export default nextConfig;
