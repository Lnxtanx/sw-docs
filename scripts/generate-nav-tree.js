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
          return {
            title: childFm.title || childSlug,
            href: `${item.href}/${childSlug}`,
            _order: typeof childFm.order === 'number' ? childFm.order : 999,
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
