/**
 * DARK MODE TOGGLE (Optional Enhancement)
 *
 * By default, dark mode uses system preferences (prefers-color-scheme).
 * This script adds a manual toggle for user preference override.
 *
 * FEATURES:
 * - Respects system preference by default
 * - Allows manual override
 * - Saves preference to localStorage
 * - Smooth transition between modes
 */

(function() {
    'use strict';

    // Check for saved user preference, otherwise use system preference
    const getThemePreference = () => {
        const saved = localStorage.getItem('theme');
        if (saved) {
            return saved;
        }
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Apply theme to document
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update toggle button icon if it exists
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '🌕' : '🌑';
            toggleBtn.setAttribute(
                'aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            );
        }
    };

    // Toggle between light and dark
    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    };

    // Initialize theme on page load
    const initTheme = () => {
        const theme = getThemePreference();
        applyTheme(theme);

        // Set up toggle button if it exists
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    };

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't set a preference
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Expose toggle function globally
    window.toggleTheme = toggleTheme;
})();
