/**
 * Generate llms.txt — standardized plain-text manifest for AI agents.
 *
 * Output format (markdown-style list):
 *   # Schema Weaver Documentation
 *   > Schema Weaver docs — database schema management tool.
 *
 *   ## Pages
 *   - [Installation](/docs/getting/started/installation): How to install Schema Weaver
 *   - [Configuration](/docs/getting/started/configuration): Setting up your project
 *   ...
 *
 * External AI agents (Cursor, Claude Desktop, etc.) read /llms.txt to discover
 * available documentation pages and can then fetch individual pages.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Recursively walk docs folder collecting all .mdx files
 */
function walkDocs(dir, prefix = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const dirSlug = prefix
        ? `${prefix}/${entry.name.replace(/^\d+-/, '')}`
        : entry.name.replace(/^\d+-/, '');
      results.push(...walkDocs(fullPath, dirSlug));
    } else if (entry.name.endsWith('.mdx')) {
      const fileSlug = entry.name === 'index.mdx'
        ? prefix
        : `${prefix ? prefix + '/' : ''}${entry.name.replace('.mdx', '')}`;
      results.push({ path: fullPath, slug: fileSlug });
    }
  }

  return results;
}

function generateLlmsTxt() {
  console.log('🤖 Generating llms.txt...');

  try {
    const mdxFiles = walkDocs(docsDir);
    const lines = [
      '# Schema Weaver Documentation',
      '',
      '> Schema Weaver — modern database schema management with visual diff, migration generation, and drift detection.',
      '',
      '## Pages',
      '',
    ];

    for (const file of mdxFiles) {
      const raw = fs.readFileSync(file.path, 'utf-8');
      const { data: fm } = matter(raw);
      const title = fm.title || file.slug;
      const desc = fm.description || '';
      const href = `/docs/${file.slug}`;
      lines.push(`- [${title}](${href})${desc ? ': ' + desc : ''}`);
    }

    lines.push(''); // trailing newline

    // Ensure public dir exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const outputPath = path.join(publicDir, 'llms.txt');
    fs.writeFileSync(outputPath, lines.join('\n'));
    console.log(`✓ Generated llms.txt → ${outputPath} (${mdxFiles.length} pages)`);
  } catch (error) {
    console.error('✗ Error generating llms.txt:', error);
    process.exit(1);
  }
}

generateLlmsTxt();
