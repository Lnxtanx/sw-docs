import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, FileText } from 'lucide-react';
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

          // Auto-expand groups containing the current route
          const newExpanded = new Set<string>();
          const currentPath = location.pathname;

          data.forEach((item: NavTreeItem) => {
            if (item.children) {
              const hasActive = item.children.some(child => currentPath.includes(child.href));
              if (hasActive) {
                newExpanded.add(item.href);
              }
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
        <p>v1.0.0-beta</p>
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
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedGroups.has(item.href);

  return (
    <li>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {hasChildren ? (
          <>
            <button
              onClick={() => onToggleGroup(item.href)}
              className="nav-group-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                fontSize: '1rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                color: 'var(--text-main)',
              }}
            >
              <ChevronDown
                size={18}
                style={{
                  transform: isExpanded ? 'rotate(0)' : 'rotate(-90deg)',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, textAlign: 'left' }}>{item.title}</span>
            </button>
          </>
        ) : (
          <NavLink
            to={item.href}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            style={{ flex: 1 }}
          >
            <FileText className="nav-icon" size={18} />
            <span>{item.title}</span>
          </NavLink>
        )}
      </div>

      {/* Child items */}
      {hasChildren && isExpanded && (
        <ul
          style={{
            marginLeft: '0',
            borderLeft: '2px solid var(--border-color)',
            paddingLeft: '0.5rem',
            listStyle: 'none',
            padding: '0.5rem 0 0.5rem 0.5rem',
            margin: '0.25rem 0 0.25rem 1rem',
          }}
        >
          {item.children!.map((child) => (
            <li key={child.href} style={{ margin: 0 }}>
              <NavLink
                to={child.href}
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                style={{
                  paddingLeft: '1rem',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  opacity: 0.5,
                  flexShrink: 0,
                }} />
                <span>{child.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
