// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site as brand } from './src/config/site.ts';
import rehypeBidi from './src/lib/rehype-bidi.mjs';

const siteUrl = brand.domain ? `https://${brand.domain}` : undefined;

export default defineConfig({
  output: 'static',
  site: siteUrl,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  // خريطة الموقع تحتاج النطاق؛ تُفعّل تلقائيًا بمجرد ضبط site.domain
  integrations: siteUrl ? [sitemap({ filter: (p) => !p.includes('/404') })] : [],
  markdown: { rehypePlugins: [rehypeBidi] },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
