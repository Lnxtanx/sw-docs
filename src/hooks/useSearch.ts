/**
 * Hook: Full-text search with fuzzy matching
 * Uses fuse.js for client-side fuzzy search
 */

import { useEffect, useState, useCallback } from 'react';
import Fuse, { type FuseResult, type FuseResultMatch } from 'fuse.js';

export interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  headings: Array<{ level: number; title: string }>;
  content: string;
  snippet: string;
}

export interface SearchResult extends SearchItem {
  score: number;
  matches?: readonly FuseResultMatch[];
}

interface UseSearchOptions {
  threshold?: number;
  maxResults?: number;
}

const SEARCH_INDEX_URL = '/_search-index.json';
const CACHE_KEY = 'sw_search_index_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load search index (with caching)
 */
async function loadSearchIndex(): Promise<SearchItem[]> {
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
  }

  try {
    const response = await fetch(SEARCH_INDEX_URL);
    if (!response.ok) throw new Error('Failed to load search index');

    const data = await response.json();
    const items = data.items || [];

    // Cache the results
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: items,
        timestamp: Date.now(),
      })
    );

    return items;
  } catch (error) {
    console.error('Error loading search index:', error);
    return [];
  }
}

/**
 * Hook for full-text search
 */
export function useSearch(options: UseSearchOptions = {}) {
  const { threshold = 0.6, maxResults = 10 } = options;

  const [items, setItems] = useState<SearchItem[]>([]);
  const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load search index once
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const data = await loadSearchIndex();
        if (mounted) {
          setItems(data);

          // Initialize Fuse with search options
          const fuseInstance = new Fuse(data, {
            keys: ['title', 'description', 'content', 'tags', 'snippet'],
            threshold,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 2,
            distance: 100,
            location: 0,
          });

          setFuse(fuseInstance);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [threshold]);

  /**
   * Search function
   */
  const search = useCallback(
    (query: string, tags?: string[]): SearchResult[] => {
      if (!fuse || !query.trim()) return [];

      let results = fuse.search(query) as Array<
        FuseResult<SearchItem> & { score: number }
      >;

      // Filter by tags if provided
      if (tags && tags.length > 0) {
        results = results.filter((result) =>
          tags.some((tag) => result.item.tags.includes(tag))
        );
      }

      // Limit results
      return results.slice(0, maxResults).map((result) => ({
        ...result.item,
        score: 1 - (result.score || 0), // Convert to match score (0-1)
        matches: result.matches,
      }));
    },
    [fuse, maxResults]
  );

  /**
   * Get all available tags
   */
  const getTags = useCallback((): string[] => {
    const tags = new Set<string>();
    items.forEach((item) => {
      item.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [items]);

  return {
    search,
    getTags,
    loading,
    error,
    itemCount: items.length,
  };
}
