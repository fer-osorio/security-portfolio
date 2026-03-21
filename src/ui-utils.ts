import { Config } from './config';

export type ElementTarget = string | HTMLElement | NodeList;

export type ValidationResult =
    | { valid: true;  error: null }
    | { valid: false; error: string };

export interface ValidateInputOptions {
    maxLength?: number;
    minLength?: number;
    required?:  boolean;
    pattern?:   RegExp | null;
}

export const UIUtils = {

    // ========================================================================
    // SECURITY & DOM MANIPULATION
    // ========================================================================

    escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    createSecureElement(tag: string, text = '', attributes: Record<string, string> = {}): HTMLElement {
        const element = document.createElement(tag);

        if (text) {
            element.textContent = text;
        }

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

    async copyToClipboard(text: string, button: HTMLElement | null = null): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);

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

    setupCopyButtons(): void {
        const copyButtons = document.querySelectorAll('.copy-btn');

        copyButtons.forEach(button => {
            const newButton = button.cloneNode(true) as HTMLElement;
            button.parentNode!.replaceChild(newButton, button);

            newButton.addEventListener('click', async function(this: HTMLElement) {
                const targetId = this.getAttribute('data-copy');
                const targetElement = targetId ? document.getElementById(targetId) : null;

                if (targetElement) {
                    const text = targetElement.textContent ?? '';
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

    setupTabs(): void {
        const tabs = document.querySelectorAll('.tab-button');

        tabs.forEach(tab => {
            const newTab = tab.cloneNode(true) as HTMLElement;
            tab.parentNode!.replaceChild(newTab, tab);

            newTab.addEventListener('click', function(this: HTMLElement) {
                const targetTab = this.getAttribute('data-tab') ?? '';
                UIUtils.switchTab(targetTab, this);
            });
        });
    },

    switchTab(targetTabId: string, clickedTab: HTMLElement | null = null): void {
        document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        if (clickedTab) {
            clickedTab.classList.add('active');
        }

        const targetPanel = document.getElementById(targetTabId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            requestAnimationFrame(() => {
                const canvases = targetPanel.querySelectorAll('canvas');
                canvases.forEach(canvas => {
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

    showError(message: string, elementId = 'error-message', duration: number | null = null): void {
        const errorDiv = document.getElementById(elementId);

        if (errorDiv) {
            errorDiv.textContent = Config.formatTemplate(
                Config.TEMPLATES.ERROR_GENERIC,
                { message }
            );
            errorDiv.hidden = false;
            errorDiv.className = 'alert alert--error';

            this.scrollToElement(errorDiv, 'center');

            const hideAfter = duration || Config.UI.ERROR_DISPLAY_DURATION;
            setTimeout(() => { errorDiv.hidden = true; }, hideAfter);
        } else {
            alert('Error: ' + message);
        }
    },

    showWarning(message: string, elementId = 'warning-message', duration: number | null = null): void {
        let warningDiv = document.getElementById(elementId);

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

        const hideAfter = duration || Config.UI.WARNING_DISPLAY_DURATION;
        setTimeout(() => { warningDiv!.hidden = true; }, hideAfter);
    },

    showSuccess(message: string, elementId = 'success-message', duration: number | null = null): void {
        let successDiv = document.getElementById(elementId);

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

        const hideAfter = duration || Config.UI.SUCCESS_DISPLAY_DURATION;
        setTimeout(() => { successDiv!.hidden = true; }, hideAfter);
    },

    hideMessage(elementId: string): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.hidden = true;
        }
    },

    // ========================================================================
    // RESULT MANAGEMENT
    // ========================================================================

    clearResults(elementIds: string | string[]): void {
        const ids = Array.isArray(elementIds) ? elementIds : [elementIds];

        ids.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.style.display = 'none';
            }
        });
    },

    displayResults(elementId: string, content: string, scroll = true): void {
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

    scrollToElement(element: string | HTMLElement, block: ScrollLogicalPosition = 'start'): void {
        const el = typeof element === 'string'
            ? document.getElementById(element)
            : element;

        if (el) {
            el.scrollIntoView({
                behavior: Config.UI.SCROLL_BEHAVIOR,
                block,
            });
        }
    },

    scrollToTop(): void {
        window.scrollTo({
            top: 0,
            behavior: Config.UI.SCROLL_BEHAVIOR,
        });
    },

    // ========================================================================
    // LOADING STATES
    // ========================================================================

    showLoading(element: string | HTMLElement, message: string | null = null): void {
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

    hideLoading(element: string | HTMLElement): void {
        const el = typeof element === 'string'
            ? document.getElementById(element)
            : element;

        if (el) {
            el.hidden = true;
        }
    },

    setButtonLoading(button: HTMLElement | null, loadingText = 'Loading...'): void {
        if (!button) return;

        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent ?? '';
            button.dataset.originalDisabled = String((button as HTMLButtonElement).disabled);
        }

        (button as HTMLButtonElement).disabled = true;
        button.textContent = loadingText;
        button.classList.add('loading');
    },

    resetButton(button: HTMLElement | null, text: string | null = null): void {
        if (!button) return;

        (button as HTMLButtonElement).disabled = button.dataset.originalDisabled === 'true';
        button.textContent = text || button.dataset.originalText || 'Submit';
        button.classList.remove('loading');

        delete button.dataset.originalText;
        delete button.dataset.originalDisabled;
    },

    // ========================================================================
    // FORM UTILITIES
    // ========================================================================

    getFormData(form: string | HTMLFormElement): Record<string, string> {
        const formEl = typeof form === 'string'
            ? document.getElementById(form) as HTMLFormElement | null
            : form;

        if (!formEl) {
            console.error('Form not found');
            return {};
        }

        const formData = new FormData(formEl);
        const data: Record<string, string> = {};

        formData.forEach((value, key) => {
            data[key] = value as string;
        });

        return data;
    },

    validateInput(input: string, options: ValidateInputOptions = {}): ValidationResult {
        const {
            maxLength = Config.SECURITY.MAX_INPUT_LENGTH,
            minLength = 0,
            required  = false,
            pattern   = null,
        } = options;

        if (required && (!input || input.trim().length === 0)) {
            return { valid: false, error: 'This field is required' };
        }

        if (input.length < minLength) {
            return { valid: false, error: `Minimum length is ${minLength} characters` };
        }

        if (input.length > maxLength) {
            return { valid: false, error: `Maximum length is ${maxLength} characters` };
        }

        if (pattern && !pattern.test(input)) {
            return { valid: false, error: 'Invalid format' };
        }

        return { valid: true, error: null };
    },

    disableForm(form: string | HTMLFormElement): void {
        const formEl = typeof form === 'string'
            ? document.getElementById(form)
            : form;

        if (formEl) {
            const inputs = formEl.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => ((input as HTMLInputElement).disabled = true));
        }
    },

    enableForm(form: string | HTMLFormElement): void {
        const formEl = typeof form === 'string'
            ? document.getElementById(form)
            : form;

        if (formEl) {
            const inputs = formEl.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => ((input as HTMLInputElement).disabled = false));
        }
    },

    // ========================================================================
    // DEBOUNCING
    // ========================================================================

    debounce<T extends (...args: unknown[]) => void>(func: T, wait?: number): (...args: Parameters<T>) => void {
        const delay = wait ?? Config.UI.DEBOUNCE_DELAY;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        return function executedFunction(...args: Parameters<T>): void {
            const later = (): void => {
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

    elementExists(elementId: string): boolean {
        return document.getElementById(elementId) !== null;
    },

    toggleElement(element: string | HTMLElement, show: boolean | null = null): void {
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

    addClass(elements: ElementTarget, className: string): void {
        const els = this._normalizeElements(elements);
        els.forEach(el => el.classList.add(className));
    },

    removeClass(elements: ElementTarget, className: string): void {
        const els = this._normalizeElements(elements);
        els.forEach(el => el.classList.remove(className));
    },

    toggleClass(elements: ElementTarget, className: string): void {
        const els = this._normalizeElements(elements);
        els.forEach(el => el.classList.toggle(className));
    },

    _normalizeElements(elements: ElementTarget): HTMLElement[] {
        if (typeof elements === 'string') {
            return [document.getElementById(elements)].filter((el): el is HTMLElement => el !== null);
        } else if (elements instanceof NodeList) {
            return Array.from(elements) as HTMLElement[];
        } else if (elements instanceof HTMLElement) {
            return [elements];
        }
        return [];
    },
};

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    if (Config.FEATURES.ENABLE_AUTO_INIT_UI) {
        if (document.querySelector('.copy-btn')) {
            UIUtils.setupCopyButtons();
            if (Config.DEBUG.VERBOSE) {
                console.log('✓ Copy buttons auto-initialized');
            }
        }

        if (document.querySelector('.tab-button')) {
            UIUtils.setupTabs();
            if (Config.DEBUG.VERBOSE) {
                console.log('✓ Tabs auto-initialized');
            }
        }
    }
});
