import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { NavTreeItem } from '../../lib/mdx/types.js';

export function Sidebar() {
  const [navTree, setNavTree] = useState<NavTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const location = useLocation();

  // Load navigation tree at mount
  useEffect(() => {
    const loadNavTree = async () => {
      try {
        const response = await fetch('/_nav-tree.json');
        if (response.ok) {
          const data = await response.json();
          setNavTree(data);

          // Auto-expand the section containing the current route. Matches the
          // exact route or a nested route under it, so sibling paths that
          // merely share a prefix do not expand each other.
          const newExpanded = new Set<string>();
          const currentPath = location.pathname;

          data.forEach((item: NavTreeItem) => {
            const kids = item.children ?? [];
            if (kids.length === 0) return;
            const isOwnPage = currentPath === item.href;
            const hasActiveChild = kids.some(
              (child) => currentPath === child.href || currentPath.startsWith(`${child.href}/`)
            );
            if (isOwnPage || hasActiveChild) {
              newExpanded.add(item.href);
            }
          });

          setExpandedGroups(newExpanded);
        }
      } catch (error) {
        console.error('Failed to load navigation tree:', error);
        setNavTree([]);
      } finally {
        setLoading(false);
      }
    };

    loadNavTree();
  }, [location.pathname]);

  const handleToggleGroup = (href: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(href)) {
        newSet.delete(href);
      } else {
        newSet.add(href);
      }
      return newSet;
    });
  };

  return (
    <aside className="sidebar">


      <nav className="sidebar-nav">
        {loading ? (
          <p style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Loading...
          </p>
        ) : (
          <ul>
            {navTree.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                expandedGroups={expandedGroups}
                onToggleGroup={handleToggleGroup}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="sidebar-footer">
        <a
          href="https://schemaweaver.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-footer-link"
        >
          <img
            src="/resona.png"
            alt="Schema Weaver"
            className="sidebar-footer-logo"
          />
          <span className="sidebar-footer-text">
            Schema Weaver
          </span>
        </a>
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  item: NavTreeItem;
  expandedGroups: Set<string>;
  onToggleGroup: (href: string) => void;
}

function SidebarItem({ item, expandedGroups, onToggleGroup }: SidebarItemProps) {
  // A section's first child is its own Overview page, so it repeats the
  // section's href. Drop it — the section title already links there. Any
  // section left with no real children (Introduction, Team Collaboration)
  // renders as a single plain link instead of a toggle plus a redundant child.
  const children = (item.children ?? []).filter((child) => child.href !== item.href);
  const isLeaf = children.length === 0;
  const isExpanded = expandedGroups.has(item.href);

  if (isLeaf) {
    return (
      <li>
        <div className="nav-row">
          <NavLink
            to={item.href}
            className={({ isActive }) => isActive ? 'nav-section-link active' : 'nav-section-link'}
          >
            <FileText className="nav-icon" size={18} />
            <span>{item.title}</span>
          </NavLink>
          <span className="nav-chevron-placeholder" aria-hidden="true" />
        </div>
      </li>
    );
  }

  return (
    <li>
      <div className="nav-row">
        <NavLink
          to={item.href}
          end
          className={({ isActive }) => isActive ? 'nav-section-link active' : 'nav-section-link'}
        >
          <FileText className="nav-icon" size={18} />
          <span>{item.title}</span>
        </NavLink>

        <button
          onClick={() => onToggleGroup(item.href)}
          className={isExpanded ? 'nav-chevron' : 'nav-chevron collapsed'}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`}
          aria-expanded={isExpanded}
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {isExpanded && (
        <ul className="nav-children">
          {children.map((child) => (
            <li key={child.href}>
              <NavLink
                to={child.href}
                className={({ isActive }) => isActive ? 'nav-subitem active' : 'nav-subitem'}
              >
                <ChevronRight size={14} className="nav-subitem-icon" />
                <span>{child.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
