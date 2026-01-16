/**
 * ============================================================================
 * CRYPTOGRAPHY PORTFOLIO - MAIN APPLICATION LOGIC
 *
 * SECURITY PRINCIPLES DEMONSTRATED HERE:
 * 1. No external tracking scripts
 * 2. Input validation (when handling user data)
 * 3. Content Security Policy compliance
 * 4. Safe DOM manipulation (prevent XSS)
 * 5. Secure navigation handling
 *
 * JAVASCRIPT ORGANIZATION:
 * - Initialization: Code that runs when page loads
 * - Utility functions: Reusable helper functions
 * - Event handlers: Functions that respond to user interactions
 * - Security helpers: Functions for secure operations
 *
 * ============================================================================
 */

// ============================================================================
// INITIALIZATION: Runs when the page fully loads
// ============================================================================

// DOM Content Loaded: Ensures HTML is parsed before we manipulate it
document.addEventListener('DOMContentLoaded', function() {
    console.log('Application initialized');

    // Initialize interactive features
    setupNavigation();
    setupToolButtons();
});

// ============================================================================
// NAVIGATION UTILITIES
// ============================================================================

/**
 * setupNavigation - Initialize navigation interactivity
 *
 * This function:
 * 1. Sets the active nav link based on current page
 * 2. Adds smooth scroll behavior
 * 3. Handles link highlights
 *
 * Why separate this?
 * Following good software engineering: one function = one responsibility
 * (This is the Single Responsibility Principle, applies to all code)
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');

    // Remove 'active' class from all links, then add to current
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * navigateToTool - Safely navigate to a tool page
 *
 * SECURITY NOTES:
 * 1. We validate the path to prevent path traversal attacks
 * 2. Reject: '../../admin.html' (goes up directories)
 * 3. Reject: 'pages/../../../admin.html' (sneaky traversal)
 * 4. Allow: 'pages/rsa-tool.html' (normal subdirectory)
 *
 * HOW IT WORKS:
 * - Only allow forward slashes (/) for directory separation, no backslashes
 * - Each path segment must be alphanumeric with hyphens (no dots like '..')
 * - Must end with .html
 * - Pattern: 'subdirs/filename.html' or just 'filename.html'
 *
 * @param {string} toolPath - The path to the tool (e.g., 'pages/rsa-tool.html')
 */
function navigateToTool(toolPath) {
    // Security: Validate that the path is safe
    if (!Config.SECURITY.ALLOWED_PATH_REGEX.test(toolPath)) {
        console.error('Invalid tool path:', toolPath);
        UIUtils.showError('Invalid tool path. Security check failed.');
        return;
    }

    // Additional check: Reject backslashes (Windows path separator - potential exploit)
    if (toolPath.includes('\\')) {
        console.error('Invalid tool path - backslash not allowed:', toolPath);
        UIUtils.showError('Invalid tool path. Invalid path format.');
        return;
    }

    // If validation passes, navigate
    window.location.href = toolPath;
}

// ============================================================================
// TOOL BUTTON UTILITIES
// ============================================================================

/**
 * setupToolButtons - Initialize tool card buttons
 *
 * This finds all tool buttons and adds interactivity
 */
function setupToolButtons() {
    const toolButtons = document.querySelectorAll('.btn-primary');

    toolButtons.forEach(button => {
        button.addEventListener('mouseover', function() {
            if (!this.disabled) {
                this.style.cursor = 'pointer';
            }
        });
    });
}

// ============================================================================
// UTILITY FUNCTIONS FOR COMMON TASKS
// ============================================================================

/**
 * logEvent - Secure logging (no personally identifiable information)
 *
 * PRIVACY NOTE: This logs events but NO user data, timestamps, or IP addresses
 * See: Your portfolio respects user privacy
 *
 * @param {string} eventName - Name of the event
 * @param {object} data - Event data (never include PII)
 */
function logEvent(eventName, data = {}) {
    // Only log in development (when console is open by developer)
    // Production logging should use server-side analytics respecting privacy
    if (process.env.NODE_ENV === 'development' || typeof DEBUG !== 'undefined') {
        console.log(`[${eventName}]`, data);
    }
}

/**
 * formatDate - Format a date for display
 *
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

/**
 * isSecureContext - Check if running in a secure context
 *
 * SECURITY: Cryptographic operations should only run in secure contexts
 * (HTTPS, localhost, etc.), not on plain HTTP
 *
 * @returns {boolean} - True if secure (HTTPS or localhost)
 */
function isSecureContext() {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

// ============================================================================
// CONTENT SECURITY POLICY (CSP) UTILITIES
// ============================================================================

/**
 * checkCSPCompliance - Verify CSP header is properly set
 *
 * CSP (Content Security Policy) is a security header that prevents XSS
 * It's set in the <meta> tag in the HTML <head>
 *
 * WHY: Only scripts from approved sources can run
 * This is crucial when your site has user-generated content
 */
function checkCSPCompliance() {
    if (!Config.SECURITY.CSP_ENABLED) {
        return; // Skip check if disabled in config
    }
    // The browser enforces CSP - we just verify it's active
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

    if (metaCSP) {
        console.log('✓ CSP is active:', metaCSP.getAttribute('content'));
    } else {
        console.warn('⚠ CSP meta tag not found. Consider adding it.');
    }
}

// ============================================================================
// ERROR HANDLING & DEBUGGING
// ============================================================================

/**
 * handleError - Global error handler
 *
 * Catches unexpected errors and logs them safely
 * Never expose sensitive information in error messages to users
 */
window.addEventListener('error', function(event) {
    console.error('Global error caught:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        // Never log the full error stack to users (security)
    });

    // Optionally send to a server for monitoring (with user consent)
    // sendErrorToServer(event);
});

/**
 * handleUnhandledRejection - Handle unhandled Promise rejections
 *
 * Similar to error handler but for async operations
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise rejection:', event.reason);
});

// ============================================================================
// INITIALIZATION CHECK
// ============================================================================

/**
 * Initialize security checks on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    checkCSPCompliance();

    if (!isSecureContext()) {
        console.warn('⚠ Not in a secure context. Cryptographic operations may be limited.');
    } else {
        console.log('✓ Running in secure context');
    }
});
