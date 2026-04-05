/**
 * MDX Content Type Definitions
 */

export interface Frontmatter {
  title: string;
  description?: string;
  tags?: string[];
  order?: number;
  sidebar_group?: string | null;
  toc_max_depth?: number;
  components?: string[];
  related?: RelatedLink[];
}

export interface RelatedLink {
  path: string;
  title: string;
}

export interface Heading {
  id: string;
  level: number; // 2, 3, 4
  title: string;
  children?: Heading[];
}

export interface MdxPage {
  slug: string;
  frontmatter: Frontmatter;
  content: string; // Serialized MDX
  headings: Heading[];
  raw: string; // Original .mdx content
}

export interface ContentMap {
  [slug: string]: MdxPage;
}

export interface NavTreeItem {
  title: string;
  href: string;
  icon?: string;
  children?: NavTreeItem[];
}

export interface ParseMdxOptions {
  includeHeadings?: boolean;
  maxHeadingLevel?: number;
}
