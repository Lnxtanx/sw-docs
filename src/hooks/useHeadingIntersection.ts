/**
 * Hook: Detect active heading via IntersectionObserver
 * Returns ID of heading currently in viewport (for TOC highlighting)
 */

import { useEffect, useState, useRef } from 'react';

interface IntersectionOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * Detects which heading is currently visible in viewport
 * @param headingIds - Array of heading element IDs to observe
 * @param options - IntersectionObserver options
 * @returns Active heading ID (or null if none visible)
 */
export function useHeadingIntersection(
  headingIds: string[],
  options: IntersectionOptions = {}
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Track which headings are visible
    const visibleIds = new Set<string>();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleIds.add(entry.target.id);
        } else {
          visibleIds.delete(entry.target.id);
        }
      });

      // Find the topmost visible heading
      if (visibleIds.size > 0) {
        const topmost = headingIds.find((id) => visibleIds.has(id));
        if (topmost) {
          setActiveId(topmost);
        }
      } else {
        setActiveId(null);
      }
    }, {
      rootMargin: options.rootMargin || '-100px 0px -66% 0px',
      threshold: options.threshold ?? 0,
    });

    observerRef.current = observer;

    // Start observing all headings
    headingIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [headingIds]);

  return activeId;
}
