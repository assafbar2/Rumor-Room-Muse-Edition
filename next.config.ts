import type { NextConfig } from 'next';

const isStatic = process.env.RUMOR_STATIC_EXPORT === '1';
const basePath = isStatic ? process.env.PAGES_BASE_PATH || '' : '';
const config: NextConfig = {
  ...(isStatic ? { output: 'export' as const } : {}),
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default config;
