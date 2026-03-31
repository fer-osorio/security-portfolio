import { UIUtils } from '../src/ui-utils';

describe('UIUtils.escapeHtml()', () => {
    it('escapes <', () => { expect(UIUtils.escapeHtml('<')).toBe('&lt;'); });
    it('escapes >', () => { expect(UIUtils.escapeHtml('>')).toBe('&gt;'); });
    it('escapes &', () => { expect(UIUtils.escapeHtml('&')).toBe('&amp;'); });
    it('escapes "', () => { expect(UIUtils.escapeHtml('"')).toBe('&quot;'); });
    it('passes safe strings through unchanged', () => {
        expect(UIUtils.escapeHtml('hello world')).toBe('hello world');
    });
    it('escapes a compound XSS payload', () => {
        const result = UIUtils.escapeHtml('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });
});

describe('UIUtils.validateInput()', () => {
    it('rejects strings shorter than minLength', () => {
        const r = UIUtils.validateInput('ab', { minLength: 5 });
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/minimum/i);
    });

    it('rejects strings longer than maxLength', () => {
        const r = UIUtils.validateInput('toolongstring', { maxLength: 5 });
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/maximum/i);
    });

    it('rejects input that fails a pattern regex', () => {
        const r = UIUtils.validateInput('abc123', { pattern: /^[a-z]+$/ });
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/invalid format/i);
    });

    it('accepts valid input', () => {
        const r = UIUtils.validateInput('hello', { minLength: 2, maxLength: 20, pattern: /^[a-z]+$/ });
        expect(r.valid).toBe(true);
        expect(r.error).toBeNull();
    });
});

describe('UIUtils.debounce()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('does not call the callback before the delay elapses', () => {
        const fn = vi.fn();
        const debounced = UIUtils.debounce(fn, 100);
        debounced();
        vi.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();
    });

    it('calls the callback exactly once after the delay', () => {
        const fn = vi.fn();
        const debounced = UIUtils.debounce(fn, 100);
        debounced();
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('resets the delay on each call', () => {
        const fn = vi.fn();
        const debounced = UIUtils.debounce(fn, 100);
        debounced();
        vi.advanceTimersByTime(50);
        debounced();
        vi.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(50);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('UIUtils — DOM helpers', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="target" class="box">content</div>
            <div id="hidden" hidden>hidden</div>
        `;
    });

    it('elementExists() returns true for an existing element', () => {
        expect(UIUtils.elementExists('target')).toBe(true);
    });

    it('elementExists() returns false for a missing element', () => {
        expect(UIUtils.elementExists('does-not-exist')).toBe(false);
    });

    it('toggleElement() hides a visible element when show=false', () => {
        const el = document.getElementById('target')!;
        UIUtils.toggleElement(el, false);
        expect(el.hidden).toBe(true);
    });

    it('toggleElement() shows a hidden element when show=true', () => {
        const el = document.getElementById('hidden')!;
        UIUtils.toggleElement(el, true);
        expect(el.hidden).toBe(false);
    });

    it('addClass() adds a class to an element', () => {
        const el = document.getElementById('target')!;
        UIUtils.addClass(el, 'active');
        expect(el.classList.contains('active')).toBe(true);
    });

    it('removeClass() removes a class from an element', () => {
        const el = document.getElementById('target')!;
        UIUtils.removeClass(el, 'box');
        expect(el.classList.contains('box')).toBe(false);
    });
});
