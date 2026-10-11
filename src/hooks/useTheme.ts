/**
 * useTheme — Enforces permanent global dark theme in SW Docs.
 */

import { useEffect, useCallback } from 'react';

export type Theme = 'dark';

const STORAGE_KEY = 'sw-docs-theme';

function applyTheme() {
    document.documentElement.classList.add('dark');
    document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(STORAGE_KEY, 'dark'); } catch { /* ignore */ }
}

export function useTheme() {
    useEffect(() => {
        applyTheme();
    }, []);

    const setTheme = useCallback(() => {
        applyTheme();
    }, []);

    return { theme: 'dark' as const, setTheme, isDark: true };
}
