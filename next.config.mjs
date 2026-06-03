/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Flaggen-CDN (flagcdn.com) – falls Bild-Flaggen statt Emoji genutzt werden
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
};

export default nextConfig;
