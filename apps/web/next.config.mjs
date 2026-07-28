/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ds-simboard/design-system"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Breadboard Lab, Arduino Lab, and ESP32 Lab are collapsed into one
  // unified /simulator canvas (docs/architecture/0024-*.md) — redirect
  // rather than 404 for anyone with an old bookmark or external link.
  async redirects() {
    return [
      { source: "/breadboard-lab", destination: "/simulator", permanent: true },
      { source: "/arduino-lab", destination: "/simulator", permanent: true },
      { source: "/esp32-lab", destination: "/simulator", permanent: true },
    ];
  },
};

export default nextConfig;
