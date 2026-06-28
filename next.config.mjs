/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/pdfkit/js/data/**'],
  },
};

export default nextConfig;
