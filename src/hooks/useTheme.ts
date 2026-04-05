/**
 * useTheme — Manual dark/light/system theme toggle.
 * Applies `dark` class + `data-theme` attribute to <html>.
 * Persists preference in localStorage.
 */

import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'sw-docs-theme';

function getSystemIsDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemIsDark());
    document.documentElement.classList.toggle('dark', isDark);
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        try {
            return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
        } catch {
            return 'system';
        }
    });

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Sync with system changes when using 'system' mode
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = useCallback((t: Theme) => {
        try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
        setThemeState(t);
    }, []);

    const isDark = theme === 'dark' || (theme === 'system' && getSystemIsDark());

    return { theme, setTheme, isDark };
}
