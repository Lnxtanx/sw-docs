/**
 * Dynamic Document Page
 * Loads content from ContentLoader based on URL slug.
 * Threads page context (title, content, slug) up to DocsLayout for the AI panel.
 * Renders page action bar (Copy + Share) and compiled MDX HTML.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Copy, Check, Share2 } from 'lucide-react';
import { useDocContent } from '../hooks/useDocContent.js';
import type { Heading } from '../lib/mdx/types.js';
import type { PageContext } from '../components/layout/DocsLayout.js';

interface OutletContext {
  setHeadings: (headings: Heading[]) => void;
  setPageContext: (ctx: PageContext | null) => void;
}

export function DocPage() {
  const { '*': catchAll } = useParams<{ '*': string }>();
  const { setHeadings, setPageContext } = useOutletContext<OutletContext>();
  const slug = catchAll || '';
  const { content, loading, error } = useDocContent(slug);

  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // ── Push headings to layout (TOC) ─────────────────────────────────────────
  useEffect(() => {
    if (content?.headings) {
      setHeadings(content.headings);
    } else {
      setHeadings([]);
    }
  }, [content?.headings, setHeadings]);

  // ── Push page context to layout (AI panel) ────────────────────────────────
  useEffect(() => {
    if (content) {
      setPageContext({
        title:   content.frontmatter?.title || slug,
        content: content.content || '',
        slug,
      });
    }
    // On unmount, clear context (handles navigating away from a doc page)
    return () => { setPageContext(null); };
  }, [content, slug, setPageContext]);

  // ── Copy page as plain text ───────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    const plain = (content?.content ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard permission denied */ }
  }, [content]);

  // ── Share / copy URL ──────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: content?.frontmatter?.title || 'Schema Weaver Docs',
          url,
        });
        return;
      } catch { /* user cancelled or unsupported */ }
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* silent */ }
  }, [content]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  if (error || !content) {
    return (
      <div className="page-content">
        <h1>404 — Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        {slug && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Slug: <code>{slug}</code>
          </p>
        )}
        <a href="/" style={{ color: 'var(--accent-color)' }}>
          ← Back to home
        </a>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Page action bar */}
      <div className="page-action-bar">
        <button
          className="page-action-btn"
          onClick={handleCopy}
          title="Copy page content as plain text"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
        <button
          className="page-action-btn"
          onClick={handleShare}
          title="Share this page"
        >
          <Share2 size={13} />
          <span>{shared ? 'Link copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Rendered MDX content */}
      <div
        className="mdx-content"
        dangerouslySetInnerHTML={{ __html: content.content }}
      />

      {/* Related links */}
      {content.frontmatter.related && content.frontmatter.related.length > 0 && (
        <div className="related-section">
          <h3>Related</h3>
          <ul className="related-list">
            {content.frontmatter.related.map(link => (
              <li key={link.path}>
                <a href={link.path} className="related-link">
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
