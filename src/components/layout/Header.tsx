import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu, MessageSquare } from 'lucide-react';
import { FeedbackDialog } from './FeedbackDialog.js';

interface HeaderProps {
  toggleSidebar: () => void;
  toggleAiPanel: () => void;
  aiPanelOpen: boolean;
}

export function Header({ toggleSidebar, toggleAiPanel, aiPanelOpen }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

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

          <Link to="/" className="header-logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '1.5rem', userSelect: 'none', textDecoration: 'none' }}>
             <img src="/resona.png" alt="Schema Weaver Logo" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
             <span className="header-title">Schema Weaver</span>
          </Link>

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
          <FeedbackDialog
            trigger={
              <button className="header-icon-link" title="Send Feedback">
                <MessageSquare size={17} />
              </button>
            }
          />

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
