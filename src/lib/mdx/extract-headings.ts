/**
 * Extract headings from MDX AST
 * Builds heading tree for TOC generation
 */

import type { Root } from 'mdast';
import type { Heading } from './types.js';

export function extractHeadings(ast: Root, maxLevel: number = 3): Heading[] {
  const headings: Heading[] = [];

  function visit(node: any): void {
    if (node.type === 'heading' && node.depth <= maxLevel && node.depth >= 2) {
      const text = getHeadingText(node);
      const id = generateId(text);

      const heading: Heading = {
        id,
        level: node.depth,
        title: text,
      };

      headings.push(heading);
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => visit(child));
    }
  }

  visit(ast);
  return headings;
}

/**
 * Extract plain text from heading node
 */
function getHeadingText(node: any): string {
  let text = '';

  function extract(n: any): void {
    if (n.type === 'text') {
      text += n.value;
    } else if (n.type === 'emphasis' || n.type === 'strong' || n.type === 'code') {
      if (n.children && Array.isArray(n.children)) {
        n.children.forEach(extract);
      } else if (n.value) {
        text += n.value;
      }
    } else if (n.children && Array.isArray(n.children)) {
      n.children.forEach(extract);
    }
  }

  extract(node);
  return text;
}

/**
 * Generate heading ID (for anchor links)
 * Converts "Getting Started" → "getting-started"
 */
export function generateId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}
