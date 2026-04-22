import React, { useEffect, useState } from 'react';
import { Search, Menu, Sun, Moon, Monitor, Database, BarChart3 } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';
import type { Theme } from '../../hooks/useTheme.js';

interface HeaderProps {
  toggleSidebar: () => void;
  toggleAiPanel: () => void;
  aiPanelOpen: boolean;
}

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={17} />,
  dark:  <Moon size={17} />,
  system: <Monitor size={17} />,
};

const NEXT_THEME: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function Header({ toggleSidebar, toggleAiPanel, aiPanelOpen }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Handle Cmd+K / Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="menu-button" onClick={toggleSidebar} aria-label="Toggle Menu">
            <Menu size={20} />
          </button>

          <a href="https://schemaweaver.vivekmind.com" className="header-logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '1.5rem', userSelect: 'none', textDecoration: 'none' }}>
             <img src="/resona.png" alt="Schema Weaver Logo" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
             <span className="header-title">Schema Weaver</span>
          </a>

          {/* Desktop-only product nav links */}
          <nav className="header-product-nav">
            <a href="https://sql-editor.schemaweaver.vivekmind.com" className="header-product-link">
              <Database size={15} />
              <span>SQL Editor</span>
            </a>
            <a href="https://data-explorer.schemaweaver.vivekmind.com" className="header-product-link">
              <BarChart3 size={15} />
              <span>Data Explorer</span>
            </a>
          </nav>

          <div className="search-bar" onClick={() => setSearchOpen(true)}>
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search docs..." readOnly />
            <div className="search-kbd-container">
              <kbd className="search-kbd">⌘</kbd>
              <kbd className="search-kbd">K</kbd>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Theme toggle — cycles light → dark → system */}
          <button
            className="header-icon-link"
            onClick={() => setTheme(NEXT_THEME[theme])}
            title={`Theme: ${THEME_LABELS[theme]} (click to cycle)`}
            aria-label="Toggle theme"
          >
            {THEME_ICONS[theme]}
          </button>

          <button
            className={`header-icon-link header-ai-btn${aiPanelOpen ? ' active' : ''}`}
            onClick={toggleAiPanel}
            title="Resona AI"
            aria-label="Open Resona AI Assistant"
            aria-pressed={aiPanelOpen}
          >
            <div className="header-ai-avatar-wrapper">
              <img src="/resona.png" alt="Resona AI" className="header-ai-avatar" />
            </div>
            <span className="header-ai-label">Resona AI</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <React.Suspense fallback={null}>
          <SearchDialogLazy onClose={() => setSearchOpen(false)} />
        </React.Suspense>
      )}
    </>
  );
}

const SearchDialogLazy = React.lazy(() =>
  import('../search/SearchDialog.js').then((m) => ({
    default: (props: { onClose: () => void }) => <m.SearchDialog isOpen={true} {...props} />,
  }))
);
