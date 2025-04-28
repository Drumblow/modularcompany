/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com', 'res.cloudinary.com'],
  },
  // Adicionando suporte a Postgres em ambientes serverless
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
}

// Verificar se o módulo next-pwa está disponível
try {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  });
  nextConfig = withPWA(nextConfig);
  console.log('next-pwa configurado com sucesso!');
} catch (e) {
  console.warn('next-pwa não está instalado, continuando sem PWA...');
}

module.exports = nextConfig 