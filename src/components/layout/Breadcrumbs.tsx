/**
 * Breadcrumbs Component
 * Shows navigation path: Docs > Section > Page
 * Derives from nav tree structure
 */

import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { NavTreeItem } from '../../lib/mdx/types.js';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      // Home icon only — no redundant "Docs" label on docs.schemaweaver.com
      const items: BreadcrumbItem[] = [
        { label: 'Home', href: '/introduction' },
      ];

      if (pathname === '/' || pathname === '/introduction') {
        setBreadcrumbs(items);
        return;
      }

      // Try to find path in nav tree for proper labels
      try {
        const response = await fetch('/_nav-tree.json');
        if (response.ok) {
          const navTree: NavTreeItem[] = await response.json();

          // Search nav tree for matching items
          const findPath = (
            trees: NavTreeItem[],
            target: string,
            path: BreadcrumbItem[] = []
          ): BreadcrumbItem[] | null => {
            for (const item of trees) {
              if (target.startsWith(item.href.replace(/\/$/, ''))) {
                const newPath = [...path, { label: item.title, href: item.href }];

                // Exact match
                if (target === item.href) {
                  return newPath;
                }

                // Check children
                if (item.children) {
                  const childResult = findPath(item.children, target, newPath);
                  if (childResult) return childResult;
                }
              }
            }
            return null;
          };

          const navPath = findPath(navTree, pathname);

          if (navPath) {
            setBreadcrumbs([...items, ...navPath]);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load nav tree for breadcrumbs:', error);
      }

      // Fallback: generate from URL segments
      const paths = pathname.replace(/^\//, '').split('/').filter(Boolean);
      let currentPath = '';

      for (const segment of paths) {
        currentPath += `/${segment}`;
        const label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        items.push({ label, href: currentPath });
      }

      setBreadcrumbs(items);
    };

    generateBreadcrumbs();
  }, [pathname]);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="breadcrumbs-item">
            {index === 0 ? (
              <>
                <Link to={crumb.href} className="breadcrumbs-link" title="Home">
                  <Home size={16} />
                </Link>
                {breadcrumbs.length > 1 && (
                  <ChevronRight size={16} className="breadcrumbs-separator" />
                )}
              </>
            ) : index < breadcrumbs.length - 1 ? (
              <>
                <Link to={crumb.href} className="breadcrumbs-link">
                  {crumb.label}
                </Link>
                <ChevronRight size={16} className="breadcrumbs-separator" />
              </>
            ) : (
              <span className="breadcrumbs-current">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
