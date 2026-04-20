/**
 * Dynamic document page.
 * Loads MDX content based on the current slug, pushes page context to the layout,
 * and updates page-level SEO tags once content has resolved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Copy, Share2 } from 'lucide-react';
import { ImageLightbox } from '../components/docs/ImageLightbox.js';
import type { PageContext } from '../components/layout/DocsLayout.js';
import { useDocContent } from '../hooks/useDocContent.js';
import type { Heading, NavTreeItem } from '../lib/mdx/types.js';

const DOCS_BASE_URL = 'https://docs.schemaweaver.vivekmind.com';
const APP_BASE_URL = 'https://schemaweaver.vivekmind.com';
const DEFAULT_TITLE = 'Schema Weaver Docs';
const DEFAULT_DESCRIPTION = 'Official Schema Weaver documentation for product guides, Data Explorer workflows, SQL Editor usage, APIs, and schema management.';
const DEFAULT_OG_IMAGE = `${DOCS_BASE_URL}/og-image.svg`;
const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large';
const NOT_FOUND_ROBOTS = 'noindex,follow';

interface NavLink {
  title: string;
  href: string;
}

interface OutletContext {
  setHeadings: (headings: Heading[]) => void;
  setPageContext: (ctx: PageContext | null) => void;
}

function flattenNavTree(items: NavTreeItem[]): NavLink[] {
  const result: NavLink[] = [];
  const seenHrefs = new Set<string>();

  function walk(items: NavTreeItem[]) {
    for (const item of items) {
      if (!seenHrefs.has(item.href)) {
        result.push({ title: item.title, href: item.href });
        seenHrefs.add(item.href);
      }
      if (item.children) {
        walk(item.children);
      }
    }
  }

  walk(items);
  return result;
}

function upsertJsonLd(id: string, data: object) {
  let tag = document.querySelector<HTMLScriptElement>(`script[data-ld="${id}"]`);
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.setAttribute('data-ld', id);
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.querySelector(`script[data-ld="${id}"]`)?.remove();
}

function setMetaByName(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function removeMetaByName(name: string) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

function setMetaByProperty(property: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setCanonical(href: string) {
  let tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = href;
}

function humanizeSegment(segment: string) {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildBreadcrumbSchema(pathname: string, pageTitle?: string) {
  const parts = pathname.replace(/^\//, '').split('/').filter(Boolean);
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Docs',
      item: DOCS_BASE_URL,
    },
    ...parts.map((part, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: humanizeSegment(part),
      item: `${DOCS_BASE_URL}/${parts.slice(0, index + 1).join('/')}`,
    })),
  ];

  if (pageTitle && items.length > 1) {
    items[items.length - 1].name = pageTitle;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function applyDefaultHead() {
  document.title = DEFAULT_TITLE;
  setMetaByName('author', 'Schema Weaver');
  setMetaByName('description', DEFAULT_DESCRIPTION);
  setMetaByName('robots', DEFAULT_ROBOTS);
  removeMetaByName('keywords');
  setCanonical(`${DOCS_BASE_URL}/`);

  setMetaByProperty('og:type', 'website');
  setMetaByProperty('og:site_name', DEFAULT_TITLE);
  setMetaByProperty('og:title', DEFAULT_TITLE);
  setMetaByProperty('og:description', DEFAULT_DESCRIPTION);
  setMetaByProperty('og:url', `${DOCS_BASE_URL}/`);
  setMetaByProperty('og:image', DEFAULT_OG_IMAGE);
  setMetaByProperty('og:image:alt', 'Schema Weaver Docs social preview');
  setMetaByProperty('og:image:width', '1200');
  setMetaByProperty('og:image:height', '630');

  setMetaByName('twitter:card', 'summary_large_image');
  setMetaByName('twitter:title', DEFAULT_TITLE);
  setMetaByName('twitter:description', DEFAULT_DESCRIPTION);
  setMetaByName('twitter:image', DEFAULT_OG_IMAGE);
  setMetaByName('twitter:image:alt', 'Schema Weaver Docs social preview');

  removeJsonLd('tech-article-ld');
  removeJsonLd('breadcrumb-ld');
}

function applyNotFoundHead(pathname: string) {
  const canonical = `${DOCS_BASE_URL}${pathname}`;
  const title = `Page Not Found | ${DEFAULT_TITLE}`;
  const description = 'The requested documentation page could not be found.';

  document.title = title;
  setMetaByName('author', 'Schema Weaver');
  setMetaByName('description', description);
  setMetaByName('robots', NOT_FOUND_ROBOTS);
  removeMetaByName('keywords');
  setCanonical(canonical);

  setMetaByProperty('og:type', 'website');
  setMetaByProperty('og:site_name', DEFAULT_TITLE);
  setMetaByProperty('og:title', title);
  setMetaByProperty('og:description', description);
  setMetaByProperty('og:url', canonical);
  setMetaByProperty('og:image', DEFAULT_OG_IMAGE);
  setMetaByProperty('og:image:alt', 'Schema Weaver Docs social preview');
  setMetaByProperty('og:image:width', '1200');
  setMetaByProperty('og:image:height', '630');

  setMetaByName('twitter:card', 'summary_large_image');
  setMetaByName('twitter:title', title);
  setMetaByName('twitter:description', description);
  setMetaByName('twitter:image', DEFAULT_OG_IMAGE);
  setMetaByName('twitter:image:alt', 'Schema Weaver Docs social preview');

  removeJsonLd('tech-article-ld');
  removeJsonLd('breadcrumb-ld');
}

function applyContentHead(
  title: string,
  description: string,
  pathname: string,
  tags: string[] | undefined,
  section: string | undefined,
) {
  const fullTitle = `${title} | ${DEFAULT_TITLE}`;
  const canonical = `${DOCS_BASE_URL}${pathname}`;

  document.title = fullTitle;
  setMetaByName('author', 'Schema Weaver');
  setMetaByName('description', description);
  setMetaByName('robots', DEFAULT_ROBOTS);
  if (tags?.length) {
    setMetaByName('keywords', tags.join(', '));
  } else {
    removeMetaByName('keywords');
  }
  setCanonical(canonical);

  setMetaByProperty('og:type', 'article');
  setMetaByProperty('og:site_name', DEFAULT_TITLE);
  setMetaByProperty('og:title', fullTitle);
  setMetaByProperty('og:description', description);
  setMetaByProperty('og:url', canonical);
  setMetaByProperty('og:image', DEFAULT_OG_IMAGE);
  setMetaByProperty('og:image:alt', 'Schema Weaver Docs social preview');
  setMetaByProperty('og:image:width', '1200');
  setMetaByProperty('og:image:height', '630');

  setMetaByName('twitter:card', 'summary_large_image');
  setMetaByName('twitter:title', fullTitle);
  setMetaByName('twitter:description', description);
  setMetaByName('twitter:image', DEFAULT_OG_IMAGE);
  setMetaByName('twitter:image:alt', 'Schema Weaver Docs social preview');

  upsertJsonLd('tech-article-ld', {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url: canonical,
    mainEntityOfPage: canonical,
    author: {
      '@type': 'Organization',
      name: 'Schema Weaver',
      url: APP_BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Schema Weaver',
      url: APP_BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${DOCS_BASE_URL}/favicon.ico`,
      },
    },
    inLanguage: 'en',
    articleSection: section,
    keywords: tags?.join(', '),
    isPartOf: {
      '@type': 'WebSite',
      name: DEFAULT_TITLE,
      url: DOCS_BASE_URL,
    },
  });

  upsertJsonLd('breadcrumb-ld', buildBreadcrumbSchema(pathname, title));
}

function isExternalLink(href: string) {
  return /^https?:\/\//.test(href);
}

export function DocPage() {
  const { '*': catchAll } = useParams<{ '*': string }>();
  const { setHeadings, setPageContext } = useOutletContext<OutletContext>();
  // Normalize slug: remove trailing slashes to prevent 404s for URLs like /introduction/
  const rawSlug = catchAll || '';
  const slug = rawSlug.replace(/\/+$/, '');
  const { content, loading, error } = useDocContent(slug);

  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [prevPage, setPrevPage] = useState<NavLink | null>(null);
  const [nextPage, setNextPage] = useState<NavLink | null>(null);
  const mdxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/_nav-tree.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((tree: NavTreeItem[]) => {
        const flat = flattenNavTree(tree);
        const currentHref = `/${slug}`;
        const currentIndex = flat.findIndex((page) => page.href === currentHref);
        setPrevPage(currentIndex > 0 ? flat[currentIndex - 1] : null);
        setNextPage(currentIndex >= 0 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (content?.headings) {
      setHeadings(content.headings);
      return;
    }
    setHeadings([]);
  }, [content?.headings, setHeadings]);

  useEffect(() => {
    if (content) {
      setPageContext({
        title: content.frontmatter?.title || slug,
        content: content.content || '',
        slug,
      });
    }

    return () => {
      setPageContext(null);
    };
  }, [content, setPageContext, slug]);

  useEffect(() => {
    if (loading) {
      return;
    }

    // Normalize pathname: remove trailing slashes for canonical URLs
    const rawPathname = window.location.pathname;
    const pathname = rawPathname.replace(/\/+$/, '') || '/';

    if (error || !content) {
      applyNotFoundHead(pathname);
      return () => {
        applyDefaultHead();
      };
    }

    const pageTitle = content.frontmatter?.title || 'Documentation';
    const pageDescription = content.frontmatter?.description?.trim() || DEFAULT_DESCRIPTION;
    const pageSection = slug.split('/')[0] ? humanizeSegment(slug.split('/')[0]) : undefined;

    applyContentHead(
      pageTitle,
      pageDescription,
      pathname,
      content.frontmatter?.tags,
      pageSection,
    );

    return () => {
      applyDefaultHead();
    };
  }, [content, error, loading, slug]);


  const handleCopy = useCallback(async () => {
    const plainText = (content?.content ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission failures.
    }
  }, [content]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: content?.frontmatter?.title || DEFAULT_TITLE,
          url,
        });
        return;
      } catch {
        // Fall back to copying the URL when share is cancelled or unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Ignore clipboard permission failures.
    }
  }, [content]);

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="page-content">
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        {slug && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Slug: <code>{slug}</code>
          </p>
        )}
        <Link to="/introduction" style={{ color: 'var(--accent-color)' }}>
          {'<- Back to docs home'}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content">
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

      <div
        ref={mdxRef}
        className="mdx-content"
        dangerouslySetInnerHTML={{ __html: content.content }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            setLightbox({ src: img.src, alt: img.alt || '' });
          }
        }}
      />

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

      {content.frontmatter.related && content.frontmatter.related.length > 0 && (
        <div className="related-section">
          <h3>Related</h3>
          <ul className="related-list">
            {content.frontmatter.related.map((link) => (
              <li key={link.path}>
                {isExternalLink(link.path) ? (
                  <a href={link.path} className="related-link" rel="noopener noreferrer" target="_blank">
                    {link.title}
                  </a>
                ) : (
                  <Link to={link.path} className="related-link">
                    {link.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(prevPage || nextPage) && (
        <nav className="doc-pagination" aria-label="Page navigation">
          <div className="doc-pagination-inner">
            {prevPage ? (
              <Link to={prevPage.href} className="doc-pagination-btn doc-pagination-prev">
                <ChevronLeft size={16} />
                <span className="doc-pagination-label">Previous</span>
                <span className="doc-pagination-title">{prevPage.title}</span>
              </Link>
            ) : (
              <div />
            )}
            {nextPage && (
              <Link to={nextPage.href} className="doc-pagination-btn doc-pagination-next">
                <span className="doc-pagination-label">Next</span>
                <span className="doc-pagination-title">{nextPage.title}</span>
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
