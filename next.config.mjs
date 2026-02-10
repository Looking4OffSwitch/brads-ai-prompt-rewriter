/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Disable telemetry
  telemetry: {
    enabled: false,
  },
};

export default nextConfig;
