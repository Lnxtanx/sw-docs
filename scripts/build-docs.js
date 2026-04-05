/**
 * Build-time docs compiler
 * Walks docs/ folder, parses all .mdx files, generates manifest
 * Node.js script (run at build time before Vite)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public');
const contentDir = path.join(publicDir, 'content');

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir, { recursive: true });
}

/**
 * Walk docs/ folder and collect all .mdx files
 */
function walkDocsFolder(dir, prefix = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue; // Skip _meta.json, etc

    const fullPath = path.join(dir, entry.name);
    
    let cleanName = entry.name.replace(/\.mdx$/, '');
    if (entry.isDirectory()) {
      cleanName = entry.name.replace(/^\d+-/, '').replace(/-/g, '/');
    }

    const slug = prefix ? (entry.name === 'index.mdx' ? prefix : `${prefix}/${cleanName}`) : cleanName;

    if (entry.isDirectory()) {
      // Recursively walk subdirectories
      const subFiles = walkDocsFolder(fullPath, cleanName);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.mdx')) {
      files.push({
        path: fullPath,
        slug,
      });
    }
  }

  return files;
}

/** Compile markdown body to HTML (synchronous via processSync) */
function compileToHtml(body) {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
      content: {
        type: 'element',
        tagName: 'span',
        properties: { style: 'font-size:0.75em;font-weight:400;' },
        children: [{ type: 'text', value: '¶' }]
      }
    })
    .use(rehypeStringify)
    .processSync(body);
  return String(result);
}

/**
 * Parse a single .mdx file
 */
function parseMdxFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  // Extract headings from body
  const headings = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(body)) !== null) {
    const level = match[1].length;
    const title = match[2];
    const id = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    headings.push({ id, level, title });
  }

  const html = compileToHtml(body);

  return {
    frontmatter: {
      title: frontmatter.title || 'Untitled',
      description: frontmatter.description,
      tags: frontmatter.tags,
      order: frontmatter.order,
      sidebar_group: frontmatter.sidebar_group,
    },
    headings,
    body,
    html,
    raw: content,
  };
}

/**
 * Main build function
 */
async function buildDocs() {
  console.log('📚 Building docs...');

  try {
    const mdxFiles = walkDocsFolder(docsDir);
    console.log(`Found ${mdxFiles.length} .mdx files`);

    const manifest = {
      timestamp: new Date().toISOString(),
      contents: {},
    };

    // Parse each file
    for (const file of mdxFiles) {
      console.log(`  Processing: ${file.slug}`);

      const parsed = parseMdxFile(file.path);

      manifest.contents[file.slug] = {
        slug: file.slug,
        frontmatter: parsed.frontmatter,
        headings: parsed.headings,
        content: parsed.html, // Pre-compiled HTML for browser rendering
        raw: parsed.raw,
      };
    }

    // Write manifest
    const manifestPath = path.join(publicDir, '_content-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✓ Generated ${manifestPath}`);

    console.log(`✓ Built ${Object.keys(manifest.contents).length} docs`);
    console.log('✓ Docs build complete!');
  } catch (error) {
    console.error('✗ Error building docs:', error);
    process.exit(1);
  }
}

buildDocs();
