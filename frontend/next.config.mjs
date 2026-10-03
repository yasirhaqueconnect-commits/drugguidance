/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 10,
  },
};

export default nextConfig;
