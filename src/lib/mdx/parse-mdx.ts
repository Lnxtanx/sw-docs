/**
 * MDX Parsing Pipeline
 * Handles: frontmatter extraction → remark plugins → rehype plugins → serialization
 */

import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import type { Frontmatter, Heading, MdxPage, ParseMdxOptions } from './types.js';
import { extractHeadings } from './extract-headings.js';

/**
 * Parse a single MDX file
 * Returns: frontmatter + serialized content + extracted headings
 */
export async function parseMdx(
  content: string,
  slug: string,
  options: ParseMdxOptions = {}
): Promise<MdxPage> {
  const {
    includeHeadings = true,
    maxHeadingLevel = 3,
  } = options;

  // 1. Extract frontmatter
  const { data: rawFrontmatter, content: mdxBody } = matter(content);
  const frontmatter = validateFrontmatter(rawFrontmatter);

  // 2. Parse MDX to AST
  const ast = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm)
    .use(remarkDirective)
    .parse(mdxBody);

  // 3. Extract headings before processing
  let headings: Heading[] = [];
  if (includeHeadings) {
    headings = extractHeadings(ast, maxHeadingLevel);
  }

  // 4. Transform to HTML via rehype
  const htmlAst = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: { className: 'heading-anchor' },
    })
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeStringify)
    .process(mdxBody);

  const serializedContent = String(htmlAst);

  return {
    slug,
    frontmatter,
    content: serializedContent,
    headings,
    raw: content,
  };
}

/**
 * Validate and normalize frontmatter
 */
function validateFrontmatter(data: unknown): Frontmatter {
  if (!data || typeof data !== 'object') {
    throw new Error('Frontmatter must be an object');
  }

  const obj = data as Record<string, unknown>;

  const frontmatter: Frontmatter = {
    title: String(obj.title || 'Untitled'),
    description: obj.description ? String(obj.description) : undefined,
    tags: Array.isArray(obj.tags) ? obj.tags.map(String) : undefined,
    order: typeof obj.order === 'number' ? obj.order : undefined,
    sidebar_group: obj.sidebar_group === null ? null : (obj.sidebar_group ? String(obj.sidebar_group) : undefined),
    toc_max_depth: typeof obj.toc_max_depth === 'number' ? obj.toc_max_depth : undefined,
    components: Array.isArray(obj.components) ? obj.components.map(String) : undefined,
    related: Array.isArray(obj.related) ? obj.related.filter(isRelatedLink) : undefined,
  };

  return frontmatter;
}

function isRelatedLink(item: unknown): item is { path: string; title: string } {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.path === 'string' && typeof obj.title === 'string';
}

/**
 * Parse multiple MDX files (batch operation)
 */
export async function parseMdxBatch(
  files: Array<{ slug: string; content: string }>,
  options?: ParseMdxOptions
): Promise<MdxPage[]> {
  return Promise.all(
    files.map(file => parseMdx(file.content, file.slug, options))
  );
}
