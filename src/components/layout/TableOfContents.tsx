/**
 * Table of Contents Component
 * Displays heading outline with scroll-sync highlighting
 */

import type { Heading } from '../../lib/mdx/types.js';
import { useHeadingIntersection } from '../../hooks/useHeadingIntersection.js';

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const headingIds = headings.map((h) => h.id);
  const activeId = useHeadingIntersection(headingIds);

  if (!headings.length) {
    return (
      <nav className="toc-container">
        <div className="toc-label">On this page</div>
        <p className="toc-empty">No headings</p>
      </nav>
    );
  }

  return (
    <nav className="toc-container">
      <div className="toc-label">On this page</div>
      <ul className="toc-list">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={`toc-item ${
              heading.level === 3 ? 'toc-nested' : ''
            } ${activeId === heading.id ? 'toc-active' : ''}`}
          >
            <a
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (element) {
                  element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }
              }}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
