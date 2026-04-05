/**
 * Dynamic Document Page
 * Loads content from ContentLoader based on URL slug.
 * Threads page context (title, content, slug) up to DocsLayout for the AI panel.
 * Renders page action bar (Copy + Share) and compiled MDX HTML.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Copy, Check, Share2 } from 'lucide-react';
import { useDocContent } from '../hooks/useDocContent.js';
import { ImageLightbox } from '../components/docs/ImageLightbox.js';
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

  // ── Lightbox state ────────────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const mdxRef = useRef<HTMLDivElement>(null);

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

  // ── Dynamic SEO meta tags ─────────────────────────────────────────────────
  useEffect(() => {
    if (!content) return;

    const pageTitle = content.frontmatter?.title;
    const pageDesc  = content.frontmatter?.description;
    const canonical = `https://docs.schemaweaver.com${window.location.pathname}`;

    // <title>
    document.title = pageTitle
      ? `${pageTitle} — Schema Weaver Docs`
      : 'Schema Weaver Docs';

    // <meta name="description">
    let descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.name = 'description';
      document.head.appendChild(descTag);
    }
    if (pageDesc) descTag.content = pageDesc;

    // <link rel="canonical">
    let canonTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonTag) {
      canonTag = document.createElement('link');
      canonTag.rel = 'canonical';
      document.head.appendChild(canonTag);
    }
    canonTag.href = canonical;

    // Open Graph
    const setMeta = (prop: string, val: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', prop);
        document.head.appendChild(tag);
      }
      tag.content = val;
    };
    if (pageTitle) setMeta('og:title', `${pageTitle} — Schema Weaver Docs`);
    if (pageDesc)  setMeta('og:description', pageDesc);
    setMeta('og:url', canonical);

    // Restore defaults on unmount
    return () => {
      document.title = 'Schema Weaver Docs';
    };
  }, [content]);

  // ── Attach lightbox click handlers to MDX images ─────────────────────────
  useEffect(() => {
    const container = mdxRef.current;
    if (!container) return;

    const imgs = container.querySelectorAll<HTMLImageElement>('img');
    const handlers: Array<() => void> = [];

    imgs.forEach(img => {
      const handler = () => setLightbox({ src: img.src, alt: img.alt || '' });
      img.addEventListener('click', handler);
      img.style.cursor = 'zoom-in';
      handlers.push(() => img.removeEventListener('click', handler));
    });

    return () => handlers.forEach(off => off());
  }, [content]); // re-run whenever content changes (page navigation)

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
        ref={mdxRef}
        className="mdx-content"
        dangerouslySetInnerHTML={{ __html: content.content }}
      />

      {/* Image lightbox */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

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
