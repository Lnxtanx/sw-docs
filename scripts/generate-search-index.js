/**
 * Generate search index from all .mdx files
 * Creates _search-index.json for client-side fuzzy search
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Extract plain text content from HTML
 */
function extractTextFromHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract headings and first paragraph as snippet
 */
function extractSnippet(content) {
  // Get first paragraph (before first h2)
  const paragraphs = content.split('\n\n').filter((p) => {
    const trimmed = p.trim();
    return trimmed && !trimmed.startsWith('#');
  });

  const snippet = paragraphs[0] || '';
  return snippet.slice(0, 200); // First 200 chars
}

/**
 * Walk docs folder and collect all .mdx files
 */
function walkDocsFolder(dir, prefix = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;

    const fullPath = path.join(dir, entry.name);
    const slug = prefix ? `${prefix}/${entry.name.replace(/\.mdx$/, '')}` : entry.name.replace(/\.mdx$/, '');

    if (entry.isDirectory()) {
      const subFiles = walkDocsFolder(fullPath, slug);
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

/**
 * Parse .mdx file for search index
 */
function parseForIndex(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  // Extract headings
  const headings = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(body)) !== null) {
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
    });
  }

  // Extract snippet (first paragraph)
  const snippet = extractSnippet(body);

  // Extract plain text content for indexing
  const plainContent = body
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^#+\s+/gm, '') // Remove headings
    .replace(/[*_]/g, '') // Remove formatting
    .trim();

  return {
    title: frontmatter.title || 'Untitled',
    description: frontmatter.description || snippet,
    tags: frontmatter.tags || [],
    headings,
    content: plainContent.slice(0, 500), // First 500 chars for full text search
    snippet,
  };
}

/**
 * Generate search index
 */
function generateSearchIndex() {
  console.log('🔍 Generating search index...');

  try {
    const mdxFiles = walkDocsFolder(docsDir);
    console.log(`Found ${mdxFiles.length} .mdx files`);

    const index = [];

    // Parse each file
    for (const file of mdxFiles) {
      const parsed = parseForIndex(file.path);

      index.push({
        slug: file.slug,
        title: parsed.title,
        description: parsed.description,
        tags: parsed.tags,
        headings: parsed.headings,
        content: parsed.content,
        snippet: parsed.snippet,
      });

      console.log(`  ✓ ${file.slug}`);
    }

    // Ensure public dir exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write search index
    const indexPath = path.join(publicDir, '_search-index.json');
    fs.writeFileSync(indexPath, JSON.stringify({ items: index }, null, 2));
    console.log(`✓ Generated ${indexPath}`);
    console.log(`✓ ${index.length} pages indexed`);
  } catch (error) {
    console.error('✗ Error generating search index:', error);
    process.exit(1);
  }
}

generateSearchIndex();
