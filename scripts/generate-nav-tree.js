/**
 * Generate navigation tree from docs folder structure
 * Creates _nav-tree.json used by Sidebar component
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Read a folder-level _meta.json, if present.
 * Supports two shapes:
 *   { "slug": "Nav Title", ... }        -> title overrides
 *   { "order": ["slug", ...] }          -> order fallback when frontmatter has none
 */
function readFolderMeta(folderPath) {
  const metaPath = path.join(folderPath, '_meta.json');
  if (!fs.existsSync(metaPath)) return { titles: {}, order: [] };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    console.warn(`⚠ Skipping malformed _meta.json: ${metaPath}`);
    return { titles: {}, order: [] };
  }

  const titles = {};
  let order = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'order' && Array.isArray(value)) {
      order = value;
    } else if (typeof value === 'string') {
      titles[key] = value;
    }
  }

  return { titles, order };
}

function generateNavTree() {
  console.log('🗺️  Generating navigation tree...');

  try {
    // Read top-level _meta.json for ordering
    const metaPath = path.join(docsDir, '_meta.json');
    const meta = fs.existsSync(metaPath)
      ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      : { order: [] };

    const tree = [];

    // Read all top-level folders
    const folders = fs.readdirSync(docsDir)
      .filter(f => !f.startsWith('_'))
      .filter(f => fs.statSync(path.join(docsDir, f)).isDirectory())
      .sort((a, b) => {
        const orderA = meta.order?.indexOf(a) ?? 999;
        const orderB = meta.order?.indexOf(b) ?? 999;
        return orderA - orderB;
      });

    for (const folder of folders) {
      const folderPath = path.join(docsDir, folder);
      const indexPath = path.join(folderPath, 'index.mdx');

      if (!fs.existsSync(indexPath)) continue;

      const folderMeta = readFolderMeta(folderPath);

      // Extract frontmatter from index.mdx
      const content = fs.readFileSync(indexPath, 'utf-8');
      const { data: frontmatter } = matter(content);

      // Generate slug from folder name (remove number prefix, keep hyphens)
      const slug = folder.replace(/^\d+-/, '');

      const item = {
        title: frontmatter.title || folder,
        href: `/${slug}`,
      };

      // Check for child pages
      const childPages = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.mdx') && f !== 'index.mdx')
        .sort();

      // Include index as first child (Overview)
      const indexChild = {
        title: 'Overview',
        href: item.href,
        _order: -1,
      };

      const mappedChildren = childPages
        .map(file => {
          const childPath = path.join(folderPath, file);
          const childContent = fs.readFileSync(childPath, 'utf-8');
          const { data: childFm } = matter(childContent);
          const childSlug = file.replace('.mdx', '');
          // Precedence: frontmatter order > folder _meta.json order array > 999
          const orderFromMeta = folderMeta.order.indexOf(childSlug);
          const order =
            typeof childFm.order === 'number'
              ? childFm.order
              : orderFromMeta !== -1
                ? orderFromMeta
                : 999;
          return {
            // _meta.json is authoritative for the nav label; frontmatter title is
            // the fallback. The page H1/<title> still comes from frontmatter.
            title: folderMeta.titles[childSlug] || childFm.title || childSlug,
            href: `${item.href}/${childSlug}`,
            _order: order,
          };
        });

      item.children = [indexChild, ...mappedChildren]
        .sort((a, b) => a._order - b._order)
        .map(({ _order: _o, ...rest }) => rest);

      tree.push(item);
    }

    // Ensure public dir exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write navigation tree
    const outputPath = path.join(publicDir, '_nav-tree.json');
    fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2));
    console.log(`✓ Generated ${tree.length} nav items → ${outputPath}`);
  } catch (error) {
    console.error('✗ Error generating nav tree:', error);
    process.exit(1);
  }
}

generateNavTree();
