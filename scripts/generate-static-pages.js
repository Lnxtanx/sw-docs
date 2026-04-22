import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, '..');
const publicDir = path.join(docsRoot, 'public');
const distDir = path.join(docsRoot, 'dist');
const docsBaseUrl = 'https://docs.schemaweaver.vivekmind.com';
const appBaseUrl = 'https://schemaweaver.vivekmind.com';
const defaultOgImage = `${docsBaseUrl}/resona.png`;
const defaultDescription = 'Official Schema Weaver documentation for product guides, Data Explorer workflows, SQL Editor usage, APIs, and schema management.';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractAssetTags() {
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const stylesheetTags = indexHtml.match(/<link rel="stylesheet"[^>]+>/g) || [];
  const scriptTags = indexHtml.match(/<script type="module"[^>]+><\/script>/g) || [];
  return {
    stylesheetTags: stylesheetTags.join('\n    '),
    scriptTags: scriptTags.join('\n    '),
  };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function flattenNav(items, parentTrail = []) {
  const result = [];

  for (const item of items) {
    const trail = [...parentTrail, { title: item.title, href: item.href }];
    result.push({ title: item.title, href: item.href, trail });
    if (item.children) {
      result.push(...flattenNav(item.children, trail));
    }
  }

  return result;
}

function buildBreadcrumbJsonLd(trail, canonicalUrl, pageTitle) {
  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Docs',
      item: docsBaseUrl,
    },
    ...trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: index === trail.length - 1 ? pageTitle : item.title,
      item: `${docsBaseUrl}${item.href}`,
    })),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

function buildTechArticleJsonLd(title, description, canonicalUrl, tags, section) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: 'Schema Weaver',
      url: appBaseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Schema Weaver',
      url: appBaseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${docsBaseUrl}/favicon.ico`,
      },
    },
    inLanguage: 'en',
    articleSection: section,
    keywords: tags?.join(', '),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Schema Weaver Docs',
      url: docsBaseUrl,
    },
  };
}

function buildBreadcrumbHtml(trail) {
  const items = [
    '<li><a href="/introduction">Home</a></li>',
    ...trail.map((item, index) => {
      const isLast = index === trail.length - 1;
      if (isLast) {
        return `<li aria-current="page">${escapeHtml(item.title)}</li>`;
      }
      return `<li><a href="${item.href}">${escapeHtml(item.title)}</a></li>`;
    }),
  ];

  return `<nav class="seo-breadcrumbs" aria-label="Breadcrumb"><ol>${items.join('')}</ol></nav>`;
}

function buildRelatedHtml(related = []) {
  if (!related.length) {
    return '';
  }

  const items = related
    .map((item) => `<li><a href="${item.path}">${escapeHtml(item.title)}</a></li>`)
    .join('');

  return `
    <section class="related-section seo-related">
      <h2>Related Docs</h2>
      <ul class="related-list">${items}</ul>
    </section>
  `;
}

function buildStaticShell({ title, description, canonicalUrl, htmlContent, related, trail, tags }) {
  const fullTitle = title === 'Schema Weaver Docs' ? title : `${title} | Schema Weaver Docs`;
  const section = trail[0]?.title;
  const breadcrumbHtml = buildBreadcrumbHtml(trail);
  const relatedHtml = buildRelatedHtml(related);
  const breadcrumbLd = buildBreadcrumbJsonLd(trail, canonicalUrl, title);
  const techArticleLd = buildTechArticleJsonLd(title, description, canonicalUrl, tags, section);

  const assets = extractAssetTags();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="author" content="Schema Weaver" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta name="theme-color" content="#0f172a" />
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml((tags || []).join(', '))}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Schema Weaver Docs" />
    <meta property="og:title" content="${escapeHtml(fullTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${defaultOgImage}" />
    <meta property="og:image:alt" content="Schema Weaver Logo" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${defaultOgImage}" />
    <meta name="twitter:image:alt" content="Schema Weaver Logo" />

    <script type="application/ld+json">${JSON.stringify(techArticleLd)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>

    <script>
      (function () {
        var t = localStorage.getItem('sw-docs-theme') || 'system';
        var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) document.documentElement.classList.add('dark');
        if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
      })();
    </script>
    <style>
      .seo-static-shell { max-width: 880px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
      .seo-breadcrumbs ol { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; margin: 0 0 1.5rem; font-size: 0.9rem; }
      .seo-breadcrumbs li + li::before { content: "/"; margin-right: 0.5rem; color: #64748b; }
      .seo-breadcrumbs a { color: inherit; text-decoration: none; }
      .seo-static-shell .mdx-content { margin-bottom: 2.5rem; }
      .seo-related h2 { margin-bottom: 1rem; }
    </style>
    ${assets.stylesheetTags}
    ${assets.scriptTags}
  </head>
  <body>
    <div id="root">
      <div class="seo-static-shell page-content">
        ${breadcrumbHtml}
        <article class="mdx-content">${htmlContent}</article>
        ${relatedHtml}
      </div>
    </div>
  </body>
</html>`;
}

function build404Page() {
  const title = 'Page Not Found | Schema Weaver Docs';
  const description = 'The requested documentation page could not be found.';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,follow" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${docsBaseUrl}/404.html" />
    <style>
      body { font-family: Segoe UI, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; }
      main { max-width: 760px; margin: 0 auto; padding: 4rem 1.5rem; }
      a { color: #1d4ed8; text-decoration: none; }
      ul { padding-left: 1.2rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Page Not Found</h1>
      <p>The page you requested does not exist in the current Schema Weaver docs.</p>
      <p><a href="/introduction">Go to the docs introduction</a></p>
      <ul>
        <li><a href="/data-explorer">Data Explorer</a></li>
        <li><a href="/getting-started">Getting Started</a></li>
        <li><a href="/api-reference">API Reference</a></li>
      </ul>
    </main>
  </body>
</html>`;
}

function generate() {
  const manifest = readJson(path.join(publicDir, '_content-manifest.json'));
  const navTree = readJson(path.join(publicDir, '_nav-tree.json'));
  const flatNav = flattenNav(navTree);
  const byHref = new Map(flatNav.map((item) => [item.href, item]));

  for (const page of Object.values(manifest.contents)) {
    const href = `/${page.slug}`;
    const navItem = byHref.get(href);
    const trail = navItem?.trail || [{ title: page.frontmatter.title, href }];
    const canonicalUrl = `${docsBaseUrl}${href}`;
    const outputDir = path.join(distDir, page.slug);
    ensureDir(outputDir);

    const html = buildStaticShell({
      title: page.frontmatter.title,
      description: page.frontmatter.description || defaultDescription,
      canonicalUrl,
      htmlContent: page.content,
      related: page.frontmatter.related,
      trail,
      tags: page.frontmatter.tags,
    });

    fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  }

  const introPage = manifest.contents.introduction;
  if (introPage) {
    const homeHtml = buildStaticShell({
      title: 'Schema Weaver Docs',
      description: introPage.frontmatter.description || defaultDescription,
      canonicalUrl: `${docsBaseUrl}/`,
      htmlContent: introPage.content,
      related: introPage.frontmatter.related,
      trail: [],
      tags: introPage.frontmatter.tags,
    });
    fs.writeFileSync(path.join(distDir, 'index.html'), homeHtml);
  }

  fs.writeFileSync(path.join(distDir, '404.html'), build404Page());
  console.log(`✓ Generated static HTML pages for ${Object.keys(manifest.contents).length} docs routes`);
}

generate();
