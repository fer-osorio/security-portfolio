/**
 * ============================================================================
 * SHARED UI UTILITIES
 *
 * Common DOM manipulation, display patterns, and user interaction utilities
 * used across cryptographic demonstration tools.
 *
 * ARCHITECTURE:
 * - Pure functions where possible (no side effects)
 * - Each function handles one responsibility
 * - Security-first approach (XSS prevention)
 * - Configuration-driven behavior (uses Config module)
 *
 * DEPENDENCIES:
 * - Config module (js/config.js) must be loaded first
 *
 * ============================================================================
 */

const UIUtils = {

    // ========================================================================
    // SECURITY & DOM MANIPULATION
    // ========================================================================

    /**
     * Prevent XSS attacks by escaping HTML characters
     *
     * SECURITY CONCEPT: Cross-Site Scripting (XSS)
     *
     * Without sanitization, if user input contains:
     *   <img src=x onerror="alert('hacked')">
     * It could execute arbitrary code in the browser.
     *
     * This function converts dangerous characters to safe HTML entities:
     *   < becomes &lt;
     *   > becomes &gt;
     *   & becomes &amp;
     *   " becomes &quot;
     *   ' becomes &#039;
     *
     * TECHNIQUE: Use browser's built-in encoding via textContent
     * This is safer and faster than regex-based approaches
     *
     * @param {string} text - Raw user input
     * @returns {string} - Sanitized text safe to display
     *
     * EXAMPLE:
     *   Input:  <script>alert('xss')</script>
     *   Output: &lt;script&gt;alert('xss')&lt;/script&gt;
     *   Display: <script>alert('xss')</script> (shown as text, not executed)
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;  // textContent is safer than innerHTML
        return div.innerHTML;
    },

    /**
     * Create a DOM element safely with escaped content
     *
     * WHY: Using innerHTML directly can lead to XSS vulnerabilities
     * This function uses textContent and setAttribute for safety
     *
     * @param {string} tag - HTML tag name (e.g., 'div', 'p', 'span')
     * @param {string} text - Text content (automatically escaped)
     * @param {Object} attributes - Object with attributes to set
     * @returns {HTMLElement} - Newly created element
     *
     * EXAMPLE:
     *   createSecureElement('div', 'Hello', { class: 'greeting', id: 'msg' })
     *   => <div class="greeting" id="msg">Hello</div>
     */
    createSecureElement(tag, text = '', attributes = {}) {
        const element = document.createElement(tag);

        // Set text content safely
        if (text) {
            element.textContent = text;
        }

        // Set attributes safely (whitelist approach)
        const safeAttributes = ['class', 'id', 'data-', 'aria-', 'alt', 'title', 'type', 'name'];

        Object.keys(attributes).forEach(key => {
            const isSafe = safeAttributes.some(safe => key.startsWith(safe));

            if (isSafe) {
                element.setAttribute(key, attributes[key]);
            } else {
                console.warn(`Unsafe attribute '${key}' blocked`);
            }
        });

        return element;
    },

    // ========================================================================
    // COPY TO CLIPBOARD
    // ========================================================================

    /**
     * Copy text to clipboard with visual feedback
     *
     * BROWSER API: Uses modern Clipboard API (async)
     * Fallback: Could add execCommand fallback for older browsers
     *
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button that triggered copy (optional)
     * @returns {Promise<boolean>} - True if successful
     *
     * VISUAL FEEDBACK:
     * - Changes button text to "✓ Copied!"
     * - Adds 'copied' class for styling
     * - Reverts after Config.UI.COPY_FEEDBACK_DURATION
     */
    async copyToClipboard(text, button = null) {
        try {
            await navigator.clipboard.writeText(text);

            // Visual feedback if button provided
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.classList.add('copied');

                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, Config.UI.COPY_FEEDBACK_DURATION);
            }

            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showError('Failed to copy to clipboard');
            return false;
        }
    },

    /**
     * Setup copy-to-clipboard functionality for all copy buttons
     *
     * PATTERN: Event delegation on buttons with 'copy-btn' class
     * Each button should have data-copy attribute pointing to element ID
     *
     * HTML STRUCTURE:
     *   <code id="hash-output">abc123...</code>
     *   <button class="copy-btn" data-copy="hash-output">Copy</button>
     */
    setupCopyButtons() {
        const copyButtons = document.querySelectorAll('.copy-btn');

        copyButtons.forEach(button => {
            // Remove any existing listeners (prevent duplicates)
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', async function() {
                const targetId = this.getAttribute('data-copy');
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    const text = targetElement.textContent;
                    await UIUtils.copyToClipboard(text, this);
                } else {
                    console.error(`Copy target element not found: ${targetId}`);
                }
            });
        });
    },

    // ========================================================================
    // TAB MANAGEMENT
    // ========================================================================

    /**
     * Setup tab switching functionality
     *
     * PATTERN: Tabs with data-tab attribute switch corresponding panels
     *
     * HTML STRUCTURE:
     *   <button class="tab-button" data-tab="panel1">Tab 1</button>
     *   <button class="tab-button" data-tab="panel2">Tab 2</button>
     *   <div id="panel1" class="tab-panel active">Content 1</div>
     *   <div id="panel2" class="tab-panel">Content 2</div>
     *
     * EXTRACTED FROM: rsa-demo.js, hash-demo.js (identical implementations)
     */
    setupTabs() {
        const tabs = document.querySelectorAll('.tab-button');

        tabs.forEach(tab => {
            // Remove existing listeners
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                UIUtils.switchTab(targetTab, this);
            });
        });
    },

    /**
     * Switch to a specific tab
     *
     * @param {string} targetTabId - ID of tab panel to show
     * @param {HTMLElement} clickedTab - Tab button that was clicked (optional)
     */
    switchTab(targetTabId, clickedTab = null) {
        // Remove active class from all tabs and panels
        document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        // Add active class to clicked tab
        if (clickedTab) {
            clickedTab.classList.add('active');
        }

        // Add active class to target panel
        const targetPanel = document.getElementById(targetTabId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            // Trigger resize for any canvases in the newly visible tab
            // We need to wait for ONE animation frames:
            // 1. First rAF: Browser schedules the style recalculation
            requestAnimationFrame(() => {
                const canvases = targetPanel.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    // Dispatch custom event that visualizers can listen to
                    const event = new CustomEvent('tab-visible', { detail: { tabId: targetTabId } });
                    canvas.dispatchEvent(event);
                });
            });
        } else {
            console.error(`Tab panel not found: ${targetTabId}`);
        }
    },

    // ========================================================================
    // MESSAGE DISPLAY (Errors, Warnings, Success)
    // ========================================================================

    /**
     * Show error message to user
     *
     * @param {string} message - Error message text
     * @param {string} elementId - ID of error display element (default: 'error-message')
     * @param {number} duration - Auto-hide duration in ms (default: from Config)
     */
    showError(message, elementId = 'error-message', duration = null) {
        const errorDiv = document.getElementById(elementId);

        if (errorDiv) {
            errorDiv.textContent = Config.formatTemplate(
                Config.TEMPLATES.ERROR_GENERIC,
                { message }
            );
            errorDiv.hidden = false;
            errorDiv.className = 'alert alert--error';

            // Scroll to error
            this.scrollToElement(errorDiv, 'center');

            // Auto-hide after duration
            const hideAfter = duration || Config.UI.ERROR_DISPLAY_DURATION;
            setTimeout(() => {
                errorDiv.hidden = true;
            }, hideAfter);
        } else {
            // Fallback to alert if element doesn't exist
            alert('Error: ' + message);
        }
    },

    /**
     * Show warning message to user
     *
     * @param {string} message - Warning message text
     * @param {string} elementId - ID of warning display element
     * @param {number} duration - Auto-hide duration in ms (default: from Config)
     */
    showWarning(message, elementId = 'warning-message', duration = null) {
        let warningDiv = document.getElementById(elementId);

        // Create warning element if it doesn't exist
        if (!warningDiv) {
            warningDiv = this.createSecureElement('div', '', {
                id: elementId,
                class: 'alert alert--warning'
            });
            document.body.insertBefore(warningDiv, document.body.firstChild);
        }

        warningDiv.innerHTML = Config.formatTemplate(
            Config.TEMPLATES.WARNING_GENERIC,
            { message }
        );
        warningDiv.hidden = false;

        // Auto-hide after duration
        const hideAfter = duration || Config.UI.WARNING_DISPLAY_DURATION;
        setTimeout(() => {
            warningDiv.hidden = true;
        }, hideAfter);
    },

    /**
     * Show success message to user
     *
     * @param {string} message - Success message text
     * @param {string} elementId - ID of success display element
     * @param {number} duration - Auto-hide duration in ms (default: from Config)
     */
    showSuccess(message, elementId = 'success-message', duration = null) {
        let successDiv = document.getElementById(elementId);

        // Create success element if it doesn't exist
        if (!successDiv) {
            successDiv = this.createSecureElement('div', '', {
                id: elementId,
                class: 'alert alert--success'
            });
            document.body.insertBefore(successDiv, document.body.firstChild);
        }

        successDiv.textContent = Config.formatTemplate(
            Config.TEMPLATES.SUCCESS_GENERIC,
            { message }
        );
        successDiv.hidden = false;

        // Auto-hide after duration
        const hideAfter = duration || Config.UI.SUCCESS_DISPLAY_DURATION;
        setTimeout(() => {
            successDiv.hidden = true;
        }, hideAfter);
    },

    /**
     * Hide message element
     *
     * @param {string} elementId - ID of element to hide
     */
    hideMessage(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.hidden = true;
        }
    },

    // ========================================================================
    // RESULT MANAGEMENT
    // ========================================================================

    /**
     * Clear result displays
     *
     * @param {string|Array<string>} elementIds - Single ID or array of IDs to clear
     */
    clearResults(elementIds) {
        const ids = Array.isArray(elementIds) ? elementIds : [elementIds];

        ids.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.style.display = 'none';
            }
        });
    },

    /**
     * Display results in a container
     *
     * @param {string} elementId - Container element ID
     * @param {string} content - HTML content to display
     * @param {boolean} scroll - Whether to scroll to results (default: true)
     */
    displayResults(elementId, content, scroll = true) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = content;
            element.style.display = 'block';

            if (scroll) {
                this.scrollToElement(element, Config.UI.SCROLL_BLOCK_DEFAULT);
            }
        } else {
            console.error(`Result element not found: ${elementId}`);
        }
    },

    // ========================================================================
    // SCROLLING & NAVIGATION
    // ========================================================================

    /**
     * Scroll to element smoothly
     *
     * @param {string|HTMLElement} element - Element or element ID
     * @param {string} block - Alignment: 'start', 'center', 'end', 'nearest'
     */
    scrollToElement(element, block = 'start') {
        const el = typeof element === 'string'
        ? document.getElementById(element)
        : element;

        if (el) {
            el.scrollIntoView({
                behavior: Config.UI.SCROLL_BEHAVIOR,
                block: block
            });
        }
    },

    /**
     * Scroll to top of page
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: Config.UI.SCROLL_BEHAVIOR
        });
    },

    // ========================================================================
    // LOADING STATES
    // ========================================================================

    /**
     * Show loading indicator
     *
     * @param {string|HTMLElement} element - Element or element ID
     * @param {string} message - Loading message (default: 'Loading...')
     */
    showLoading(element, message = null) {
        const el = typeof element === 'string'
        ? document.getElementById(element)
        : element;

        if (el) {
            const loadingMessage = message || Config.TEMPLATES.INFO_LOADING;
            el.innerHTML = Config.formatTemplate(
                Config.TEMPLATES.LOADING_SPINNER,
                { message: loadingMessage }
            );
            el.style.display = 'block';
            el.hidden = false;
        }
    },

    /**
     * Hide loading indicator
     *
     * @param {string|HTMLElement} element - Element or element ID
     */
    hideLoading(element) {
        const el = typeof element === 'string'
        ? document.getElementById(element)
        : element;

        if (el) {
            el.hidden = true;
        }
    },

    /**
     * Set button to loading state
     *
     * @param {HTMLElement} button - Button element
     * @param {string} loadingText - Text to show while loading (default: 'Loading...')
     */
    setButtonLoading(button, loadingText = 'Loading...') {
        if (!button) return;

        // Store original state (if not already stored)
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
            button.dataset.originalDisabled = button.disabled;
        }

        button.disabled = true;
        button.textContent = loadingText;
        button.classList.add('loading');
    },

    /**
     * Reset button from loading state
     *
     * @param {HTMLElement} button - Button element
     * @param {string} text - Text to restore (default: original text)
     */
    resetButton(button, text = null) {
        if (!button) return;

        button.disabled = button.dataset.originalDisabled === 'true';
        button.textContent = text || button.dataset.originalText || 'Submit';
        button.classList.remove('loading');

        // Clean up stored data
        delete button.dataset.originalText;
        delete button.dataset.originalDisabled;
    },

    // ========================================================================
    // FORM UTILITIES
    // ========================================================================

    /**
     * Get form data as object
     *
     * @param {string|HTMLFormElement} form - Form element or form ID
     * @returns {Object} - Form data as key-value pairs
     */
    getFormData(form) {
        const formEl = typeof form === 'string'
        ? document.getElementById(form)
        : form;

        if (!formEl) {
            console.error('Form not found');
            return {};
        }

        const formData = new FormData(formEl);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    },

    /**
     * Validate input against security constraints
     *
     * @param {string} input - Input text to validate
     * @param {Object} options - Validation options
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    validateInput(input, options = {}) {
        const {
            maxLength = Config.SECURITY.MAX_INPUT_LENGTH,
            minLength = 0,
            required = false,
            pattern = null
        } = options;

        // Required check
        if (required && (!input || input.trim().length === 0)) {
            return { valid: false, error: 'This field is required' };
        }

        // Length checks
        if (input.length < minLength) {
            return { valid: false, error: `Minimum length is ${minLength} characters` };
        }

        if (input.length > maxLength) {
            return { valid: false, error: `Maximum length is ${maxLength} characters` };
        }

        // Pattern check
        if (pattern && !pattern.test(input)) {
            return { valid: false, error: 'Invalid format' };
        }

        return { valid: true, error: null };
    },

    /**
     * Disable form elements
     *
     * @param {string|HTMLFormElement} form - Form element or form ID
     */
    disableForm(form) {
        const formEl = typeof form === 'string'
        ? document.getElementById(form)
        : form;

        if (formEl) {
            const inputs = formEl.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => input.disabled = true);
        }
    },

    /**
     * Enable form elements
     *
     * @param {string|HTMLFormElement} form - Form element or form ID
     */
    enableForm(form) {
        const formEl = typeof form === 'string'
        ? document.getElementById(form)
        : form;

        if (formEl) {
            const inputs = formEl.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => input.disabled = false);
        }
    },

    // ========================================================================
    // DEBOUNCING
    // ========================================================================

    /**
     * Debounce function (for real-time input handlers)
     *
     * PATTERN: Delays function execution until user stops typing
     *
     * WHY: Prevents excessive computations during rapid input
     * Example: Don't hash on every keystroke, wait until user pauses
     *
     * MATHEMATICAL ANALOGY:
     * Like a low-pass filter in signal processing - ignore high-frequency
     * changes (individual keystrokes), respond to low-frequency signal
     * (completed input).
     *
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds (default: from Config)
     * @returns {Function} - Debounced function
     */
    debounce(func, wait = null) {
        const delay = wait || Config.UI.DEBOUNCE_DELAY;
        let timeout;

        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };

            clearTimeout(timeout);
            timeout = setTimeout(later, delay);
        };
    },

    // ========================================================================
    // UTILITY HELPERS
    // ========================================================================

    /**
     * Check if element exists in DOM
     *
     * @param {string} elementId - Element ID
     * @returns {boolean} - True if element exists
     */
    elementExists(elementId) {
        return document.getElementById(elementId) !== null;
    },

    /**
     * Toggle element visibility
     *
     * @param {string|HTMLElement} element - Element or element ID
     * @param {boolean} show - True to show, false to hide (optional, toggles if not provided)
     */
    toggleElement(element, show = null) {
        const el = typeof element === 'string'
        ? document.getElementById(element)
        : element;

        if (el) {
            if (show === null) {
                el.hidden = !el.hidden;
            } else {
                el.hidden = !show;
            }
        }
    },

    /**
     * Add class to element(s)
     *
     * @param {string|HTMLElement|NodeList} elements - Element(s) to modify
     * @param {string} className - Class name to add
     */
    addClass(elements, className) {
        const els = this._normalizeElements(elements);
        els.forEach(el => el.classList.add(className));
    },

    /**
     * Remove class from element(s)
     *
     * @param {string|HTMLElement|NodeList} elements - Element(s) to modify
     * @param {string} className - Class name to remove
     */
    removeClass(elements, className) {
        const els = this._normalizeElements(elements);
        els.forEach(el => el.classList.remove(className));
    },

    /**
     * Toggle class on element(s)
     *
     * @param {string|HTMLElement|NodeList} elements - Element(s) to modify
     * @param {string} className - Class name to toggle
     */
    toggleClass(elements, className) {
        const els = this._normalizeElements(elements);
        els.forEach(el => el.classList.toggle(className));
    },

    /**
     * Internal helper: Normalize elements to array
     *
     * @private
     * @param {string|HTMLElement|NodeList} elements
     * @returns {Array<HTMLElement>}
     */
    _normalizeElements(elements) {
        if (typeof elements === 'string') {
            return [document.getElementById(elements)].filter(el => el !== null);
        } else if (elements instanceof NodeList) {
            return Array.from(elements);
        } else if (elements instanceof HTMLElement) {
            return [elements];
        }
        return [];
    }
};

// ============================================================================
// MAKE AVAILABLE GLOBALLY
// ============================================================================

if (typeof window !== 'undefined') {
    window.UIUtils = UIUtils;
    console.log('✓ UI Utilities module loaded');

    // Freeze to prevent modification
    Object.freeze(UIUtils);
}

// ============================================================================
// AUTO-INITIALIZATION (Optional)
// ============================================================================

/**
 * Auto-setup common UI patterns when DOM is ready
 * Only runs if Config.FEATURES.ENABLE_AUTO_INIT_UI is enabled
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if auto-init is enabled
    const autoInit = Config.FEATURES.ENABLE_AUTO_INIT_UI;

    if (autoInit) {
        // Auto-setup copy buttons if they exist
        if (document.querySelector('.copy-btn')) {
            UIUtils.setupCopyButtons();
            if (Config.DEBUG.VERBOSE) {
                console.log('✓ Copy buttons auto-initialized');
            }
        }

        // Auto-setup tabs if they exist
        if (document.querySelector('.tab-button')) {
            UIUtils.setupTabs();
            if (Config.DEBUG.VERBOSE) {
                console.log('✓ Tabs auto-initialized');
            }
        }
    }
});
