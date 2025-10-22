/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone mode to fix static file serving
  // output: 'standalone',
  trailingSlash: false,
  assetPrefix: '',
  generateEtags: false
};
export default nextConfig;
