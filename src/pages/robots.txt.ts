import type { APIRoute } from 'astro';
import { siteUrl } from '@/config/site';

export const GET: APIRoute = () =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /404', ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap-index.xml`] : [])].join('\n') + '\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
