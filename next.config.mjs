/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true }, // временно отключаем ESLint на билде
  // experimental.serverActions УДАЛИ (эта опция больше не нужна в Next 14)
};

export default nextConfig;
