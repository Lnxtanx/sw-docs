/**
 * Hook: Load and manage doc content
 * Handles loading state, errors, and caching
 */

import { useEffect, useState } from 'react';
import type { MdxPage } from '../lib/mdx/types.js';
import { contentLoader } from '../lib/content-loader.js';

interface UseDocContentResult {
  content: MdxPage | null;
  loading: boolean;
  error: Error | null;
}

export function useDocContent(slug: string): UseDocContentResult {
  const [content, setContent] = useState<MdxPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const doc = await contentLoader.load(slug);

        if (isMounted) {
          if (doc) {
            setContent(doc);
          } else {
            setError(new Error(`Content not found: ${slug}`));
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { content, loading, error };
}
