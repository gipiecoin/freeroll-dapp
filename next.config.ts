import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* You can add your other Next.js config options here */

  // This object disables the Vercel toolbar and its related
  // development indicators from appearing on your site.
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
