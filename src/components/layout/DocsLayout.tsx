import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { TableOfContents } from './TableOfContents.js';
import { Breadcrumbs } from './Breadcrumbs.js';
import { AIChat } from '../ai/AIChat.js';
import { Outlet, useLocation } from 'react-router-dom';
import type { Heading } from '../../lib/mdx/types.js';

export interface PageContext {
  title: string;
  content: string;
  slug: string;
}

export function DocsLayout() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [headings, setHeadings]         = useState<Heading[]>([]);
  const [aiPanelOpen, setAiPanelOpen]   = useState(true);
  const [pageContext, setPageContext]    = useState<PageContext | null>(null);
  const location = useLocation();

  React.useEffect(() => {
    setSidebarOpen(false);
    // Scroll to top on every page navigation
    window.scrollTo(0, 0);
    document.querySelector('.main-content')?.scrollTo(0, 0);
    document.querySelector('.content-wrapper')?.scrollTo(0, 0);
  }, [location.pathname]);

  const toggleAiPanel = useCallback(() => setAiPanelOpen(o => !o), []);

  return (
    <div className="layout-container">
      {/* Top Header — Full width */}
      <Header
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        toggleAiPanel={toggleAiPanel}
        aiPanelOpen={aiPanelOpen}
      />

      <div className="layout-body">
        {/* Left sidebar */}
        <div className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar />
        </div>

        {/* Main area */}
        <div className="main-container">
          <div className="content-wrapper">
          <main className="main-content">
            <Breadcrumbs />
            <div className="content-inner">
              <Outlet context={{ setHeadings, setPageContext }} />
            </div>
          </main>

          {/* TOC — shown when AI panel is closed */}
          {!aiPanelOpen && (
            <aside className="toc-sidebar">
              <TableOfContents headings={headings} />
            </aside>
          )}

          {/* AI panel */}
          {aiPanelOpen && (
            <div className="ai-panel-sidebar">
              <AIChat
                isOpen={true}
                pageTitle={pageContext?.title}
                pageContent={pageContext?.content}
                pageSlug={pageContext?.slug}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
