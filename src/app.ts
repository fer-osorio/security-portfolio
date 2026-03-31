import { Config }   from './config';
import { UIUtils }  from './ui-utils';
import './dark-mode-toggle';     // side-effect: initialises theme toggle

declare global {
    interface Window {
        navigateToTool: (path: string) => void;
    }
}

function navigateToTool(toolPath: string): void {
    if (!Config.SECURITY.ALLOWED_PATH_REGEX.test(toolPath)) {
        UIUtils.showError('Invalid tool path. Security check failed.');
        return;
    }
    if (toolPath.includes('\\')) {
        UIUtils.showError('Invalid tool path. Invalid path format.');
        return;
    }
    window.location.href = toolPath;
}

function setupNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
});

window.addEventListener('error', (event) => {
    console.error('Global error:', { message: event.message, filename: event.filename });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
});

window.navigateToTool = navigateToTool;

export {};
