/**
 * Content Loader Service
 * Loads and caches MDX content from the docs folder
 * Works in both Node.js (build time) and browser (runtime)
 */

import type { MdxPage, ContentMap } from './mdx/types.js';

/**
 * Browser-side content loader
 * Fetches pre-compiled content manifest at runtime
 */
export class BrowserContentLoader {
  private cache: ContentMap = {};
  private loadingPromises: Map<string, Promise<MdxPage>> = new Map();
  private manifestLoaded = false;

  async load(slug: string): Promise<MdxPage | null> {
    // Return from cache if available
    if (this.cache[slug]) {
      return this.cache[slug];
    }

    // Return pending promise if already loading
    if (this.loadingPromises.has(slug)) {
      return this.loadingPromises.get(slug)!.then(p => p || null);
    }

    // Load manifest if not loaded
    if (!this.manifestLoaded) {
      await this.loadManifest();
    }

    // Check if content exists in manifest
    if (!this.cache[slug]) {
      return null;
    }

    return this.cache[slug];
  }

  private async loadManifest(): Promise<void> {
    try {
      console.log('BrowserContentLoader: Fetching content manifest...');
      const response = await fetch('/_content-manifest.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
      }

      const manifest = await response.json();
      
      if (!manifest || !manifest.contents) {
        throw new Error('Invalid manifest format: missing results or contents');
      }

      const { contents } = manifest;

      // Populate cache with manifest data
      const count = Object.keys(contents).length;
      for (const [slug, content] of Object.entries(contents)) {
        this.cache[slug] = content as MdxPage;
      }

      this.manifestLoaded = true;
      console.log(`BrowserContentLoader: Manifest loaded successfully (${count} pages)`);
    } catch (error) {
      this.manifestLoaded = false;
      console.error('BrowserContentLoader: Error loading content manifest:', error);
      // We don't throw here to avoid crashing the hook, but we log the full error
    }
  }

  /**
   * Get all available content slugs
   */
  async getAllSlugs(): Promise<string[]> {
    if (!this.manifestLoaded) {
      await this.loadManifest();
    }
    return Object.keys(this.cache);
  }

  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.cache = {};
    this.loadingPromises.clear();
    this.manifestLoaded = false;
  }
}

/**
 * Singleton instance
 */
export const contentLoader = new BrowserContentLoader();

/**
 * Hook for React components to load content
 */
export function useContentLoader() {
  return contentLoader;
}
