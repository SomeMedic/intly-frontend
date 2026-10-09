/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"]
  }
};

export default nextConfig;
