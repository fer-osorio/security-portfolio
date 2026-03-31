declare global {
    interface Window {
        toggleTheme: () => void;
    }
}

const getThemePreference = (): 'dark' | 'light' => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
        return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: 'dark' | 'light'): void => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = theme === 'dark' ? '🌕' : '🌑';
        toggleBtn.setAttribute(
            'aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }
};

const toggleTheme = (): void => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next: 'dark' | 'light' = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
};

const initTheme = (): void => {
    const theme = getThemePreference();
    applyTheme(theme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

window.toggleTheme = toggleTheme;

export {};
