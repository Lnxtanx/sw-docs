/**
 * Generate sitemap.xml from docs folder structure.
 * Reads all .mdx files, builds clean URLs (no /docs/ prefix, hyphens not slashes),
 * and writes public/sitemap.xml for Googlebot.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir   = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public');

const BASE_URL = 'https://docs.schemaweaver.com';

// Priority weights by depth
const PRIORITY = { 0: '1.0', 1: '0.8', 2: '0.6' };

function walkDocs(dir, prefix = '', depth = 0) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Strip numeric prefix, keep hyphens — "data-explorer" not "data/explorer"
      const dirSlug = prefix
        ? `${prefix}/${entry.name.replace(/^\d+-/, '')}`
        : entry.name.replace(/^\d+-/, '');
      results.push(...walkDocs(fullPath, dirSlug, depth + 1));
    } else if (entry.name.endsWith('.mdx')) {
      const fileSlug = entry.name === 'index.mdx'
        ? prefix
        : `${prefix ? prefix + '/' : ''}${entry.name.replace('.mdx', '')}`;

      if (!fileSlug) continue; // skip root index if any

      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data: fm } = matter(raw);

      results.push({
        slug: fileSlug,
        depth,
        lastmod: new Date().toISOString().split('T')[0],
        noindex: fm.noindex === true,
      });
    }
  }

  return results;
}

function generateSitemap() {
  console.log('🗺️  Generating sitemap.xml...');

  try {
    const pages = walkDocs(docsDir);
    const indexable = pages.filter(p => !p.noindex);

    const urls = indexable.map(page => {
      const loc      = `${BASE_URL}/${page.slug}`;
      const priority = PRIORITY[Math.min(page.depth, 2)];
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${page.lastmod}</lastmod>`,
        `    <changefreq>weekly</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    const outputPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(outputPath, xml);
    console.log(`✓ Generated sitemap.xml → ${outputPath} (${indexable.length} URLs)`);
  } catch (error) {
    console.error('✗ Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
