import type { NextConfig } from 'next';

// GitHub Pages serves project sites under /<repo>/; the deploy workflow sets this.
const basePath = process.env.PAGES_BASE_PATH ?? '';

// Static export: the whole app is plain files. Tax data never leaves the browser.
const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
