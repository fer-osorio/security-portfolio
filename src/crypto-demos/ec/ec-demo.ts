/**
 * ============================================================================
 * ELLIPTIC CURVE EXPLORER - UI CONTROLLER
 *
 * Handles all user interactions and DOM updates.
 * Acts as the "controller" in MVC architecture.
 *
 * STATE:
 * - realCurveVisualizer   — Tab 1 (real numbers)
 * - finiteCurveVisualizer — Tab 2 (finite field)
 * - finiteCurveVisualizer — Tab 2 (finite field)
 * - ecdsaState            — persists signing context for verification step
 *
 * ============================================================================
 */

import '../../dark-mode-toggle';
import { ECVisualizer, FiniteFieldCurve, RealCurve } from './ec-visualization';
import { EllipticCurve, ECDH, ECDSA, getCurve, ECKeyPair, ECDSASignature } from './ec-core';
import { isDivisibleBySmallPrime } from '../rsa/math-utils';
import { UIUtils } from '../../ui-utils';
import { Config } from '../../config';
import {
    displayWelcomeMessage,
    displayRealCurveInfo,
    displayFiniteCurveInfo,
    displayPointOperationResult,
    displayScalarMultiplyResult,
    displayECDHResults,
    displayECDSASignResults,
    displayECDSAVerifyResults,
} from './ec-display';

// ============================================================================
// MODULE-LEVEL STATE
// ============================================================================

let realCurveVisualizer:   ECVisualizer | null = null;
let finiteCurveVisualizer: ECVisualizer | null = null;

interface ECDSAState {
    curve:     EllipticCurve;
    keyPair:   ECKeyPair;
    message:   string;
    signature: ECDSASignature;
}
let ecdsaState: ECDSAState | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('ECC Explorer initialized');

    setupEventListeners();
    initializeVisualizers();
    loadDefaultCurves();
    displayWelcomeMessage();
});

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

function setupEventListeners(): void {
    // Tab 1: Real curve selection
    const realCurveSelect = document.getElementById('real-curve-select');
    if (realCurveSelect) {
        realCurveSelect.addEventListener('change', handleRealCurveChange);
    }

    // Tab 2: Finite field curve selection
    const finiteCurveSelect = document.getElementById('finite-curve-select');
    if (finiteCurveSelect) {
        finiteCurveSelect.addEventListener('change', handleFiniteCurveChange);
    }

    // Custom curve parameters (Tab 1 - Real)
    for (const id of ['real-a', 'real-b']) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', handleRealCustomCurve);
        }
    }

    // Custom curve parameters (Tab 2 - Finite)
    const applyFiniteBtn = document.getElementById('apply-finite-custom-btn');
    if (applyFiniteBtn) {
        applyFiniteBtn.addEventListener('click', handleFiniteCustomCurve);
    }

    // Point operation buttons (Tab 2 only)
    const addBtn = document.getElementById('point-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', handlePointAddition);
    }

    const doubleBtn = document.getElementById('point-double-btn');
    if (doubleBtn) {
        doubleBtn.addEventListener('click', handlePointDoubling);
    }

    const scalarBtn = document.getElementById('scalar-multiply-btn');
    if (scalarBtn) {
        scalarBtn.addEventListener('click', handleScalarMultiply);
    }

    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearSelection);
    }

    // ECDH protocol
    const ecdhBtn = document.getElementById('ecdh-demo-btn');
    if (ecdhBtn) {
        ecdhBtn.addEventListener('click', handleECDH);
    }

    // ECDSA protocol
    const ecdsaSignBtn = document.getElementById('ecdsa-sign-btn');
    if (ecdsaSignBtn) {
        ecdsaSignBtn.addEventListener('click', handleECDSASign);
    }

    const ecdsaVerifyBtn = document.getElementById('ecdsa-verify-btn');
    if (ecdsaVerifyBtn) {
        ecdsaVerifyBtn.addEventListener('click', handleECDSAVerify);
    }

    // Auto-fill verify message with signed message
    const ecdsaMessage       = document.getElementById('ecdsa-message')        as HTMLInputElement | null;
    const ecdsaVerifyMessage = document.getElementById('ecdsa-verify-message') as HTMLInputElement | null;
    if (ecdsaMessage && ecdsaVerifyMessage) {
        ecdsaMessage.addEventListener('input', () => {
            ecdsaVerifyMessage.value = ecdsaMessage.value;
        });
    }

    UIUtils.setupCopyButtons();
    UIUtils.setupTabs();
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

function initializeVisualizers(): void {
    // Tab 1: Real curve visualizer
    try {
        realCurveVisualizer = new ECVisualizer('real-curve-canvas', {
            mode: 'real',
            minX: -8,
            maxX: 8,
            minY: -8,
            maxY: 8,
        });
        console.log('Real curve visualizer initialized');
    } catch (error) {
        console.error('Failed to initialize real curve visualizer:', error);
    }

    // Tab 2: Finite field visualizer
    try {
        finiteCurveVisualizer = new ECVisualizer('finite-curve-canvas', {
            mode: 'finite',
            minX: -1,
            maxX: 30,
            minY: -1,
            maxY: 30,
        });
        console.log('Finite curve visualizer initialized (will resize when tab becomes visible)');
    } catch (error) {
        console.error('Failed to initialize finite curve visualizer:', error);
    }
}

function loadDefaultCurves(): void {
    // Tab 1: Default real curve (y² = x³ + 7, like secp256k1)
    const defaultRealCurve: RealCurve = {
        name: 'y² = x³ + 7',
        a: 0,
        b: 7,
    };

    if (realCurveVisualizer) {
        realCurveVisualizer.setCurve(defaultRealCurve);
        displayRealCurveInfo(defaultRealCurve);
    }

    // Tab 2: Default finite field curve (small for visualization)
    const defaultFiniteCurve: FiniteFieldCurve = {
        name: 'E(F₂₃): y² = x³ + 7',
        a: 0n,
        b: 7n,
        p: 23n,
    };

    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.setCurve(defaultFiniteCurve);
        displayFiniteCurveInfo(defaultFiniteCurve);
    }
}

// ============================================================================
// TAB 1: REAL CURVE HANDLERS
// ============================================================================

function handleRealCurveChange(): void {
    const select = document.getElementById('real-curve-select') as HTMLSelectElement | null;
    if (!select) return;

    const value = select.value;
    let curve: RealCurve;

    switch (value) {
        case 'koblitz':
            curve = { name: 'y² = x³ + 7', a: 0, b: 7 };
            hideCustomRealParams();
            break;
        case 'nist-like':
            curve = { name: 'y² = x³ - 3x + 3', a: -3, b: 3 };
            hideCustomRealParams();
            break;
        case 'generic':
            curve = { name: 'y² = x³ + x + 1', a: 1, b: 1 };
            hideCustomRealParams();
            break;
        case 'custom':
            showCustomRealParams();
            handleRealCustomCurve();
            return;
        default:
            return;
    }

    if (realCurveVisualizer) {
        realCurveVisualizer.setCurve(curve);
        displayRealCurveInfo(curve);
    }
}

function handleRealCustomCurve(): void {
    const aEl = document.getElementById('real-a') as HTMLInputElement | null;
    const bEl = document.getElementById('real-b') as HTMLInputElement | null;

    const a = aEl ? (parseFloat(aEl.value) || 0) : 0;
    const b = bEl ? (parseFloat(bEl.value) || 0) : 0;

    // Update display values
    const aValueEl = document.getElementById('real-a-value');
    const bValueEl = document.getElementById('real-b-value');
    if (aValueEl) aValueEl.textContent = String(a);
    if (bValueEl) bValueEl.textContent = String(b);

    const curve: RealCurve = {
        name: `y² = x³ + ${a}x + ${b}`,
        a,
        b,
    };

    if (realCurveVisualizer) {
        realCurveVisualizer.setCurve(curve);
        displayRealCurveInfo(curve);
    }
}

function showCustomRealParams(): void {
    const customDiv = document.getElementById('custom-real-params');
    if (customDiv) {
        customDiv.style.display = 'block';
    }
}

function hideCustomRealParams(): void {
    const customDiv = document.getElementById('custom-real-params');
    if (customDiv) {
        customDiv.style.display = 'none';
    }
}

// ============================================================================
// TAB 2: FINITE FIELD CURVE HANDLERS
// ============================================================================

function handleFiniteCurveChange(): void {
    const select = document.getElementById('finite-curve-select') as HTMLSelectElement | null;
    if (!select) return;

    const value = select.value;
    let curve: FiniteFieldCurve;

    switch (value) {
        case 'test-23':
            curve = { name: 'E(F₂₃): y² = x³ + 7', a: 0n, b: 7n, p: 23n };
            hideCustomFiniteParams();
            break;
        case 'test-97':
            curve = { name: 'E(F₉₇): y² = x³ + 2x + 3', a: 2n, b: 3n, p: 97n };
            hideCustomFiniteParams();
            break;
        case 'custom':
            showCustomFiniteParams();
            return;
        default:
            return;
    }

    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.setCurve(curve);
        displayFiniteCurveInfo(curve);
    }
}

function handleFiniteCustomCurve(): void {
    const aEl = document.getElementById('finite-a') as HTMLInputElement | null;
    const bEl = document.getElementById('finite-b') as HTMLInputElement | null;
    const pEl = document.getElementById('finite-p') as HTMLInputElement | null;

    const a = BigInt(aEl?.value || '0');
    const b = BigInt(bEl?.value || '0');
    const p = BigInt(pEl?.value || '23');

    // Validate prime (basic check)
    if (p < 2n) {
        UIUtils.showError('Prime p must be at least 2');
        return;
    }

    if (p > Config.ECC.MAX_POINT_AMOUNTn) {
        UIUtils.showWarning('Large primes may not visualize well');
    }

    // If p is not prime, disable point operations; enable them otherwise
    const notPrime = isDivisibleBySmallPrime(p);

    const buttonIds: string[] = [
        'point-add-btn',
        'point-double-btn',
        'scalar-multiply-btn',
        'clear-selection-btn',
    ];
    for (const id of buttonIds) {
        const btn = document.getElementById(id) as HTMLButtonElement | null;
        if (btn) btn.disabled = notPrime;
    }
    const scalarInput = document.getElementById('scalar-input') as HTMLInputElement | null;
    if (scalarInput) scalarInput.disabled = notPrime;

    if (notPrime) {
        UIUtils.showError('Provided number p is not a prime, point operations are disabled');
    }

    const curve: FiniteFieldCurve = {
        name: `E(F₍${p}₎): y² = x³ + ${a}x + ${b}`,
        a,
        b,
        p,
    };

    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.setCurve(curve);
        displayFiniteCurveInfo(curve);
    }
}

function showCustomFiniteParams(): void {
    const customDiv = document.getElementById('custom-finite-params');
    if (customDiv) {
        customDiv.style.display = 'block';
    }
}

function hideCustomFiniteParams(): void {
    const customDiv = document.getElementById('custom-finite-params');
    if (customDiv) {
        customDiv.style.display = 'none';
    }
}

// ============================================================================
// POINT OPERATION HANDLERS (TAB 2 ONLY)
// ============================================================================

async function handlePointAddition(): Promise<void> {
    if (!finiteCurveVisualizer) {
        UIUtils.showError('Finite curve visualizer not initialized');
        return;
    }

    const selected = finiteCurveVisualizer.getSelectedPoints();

    if (selected.length < 2) {
        UIUtils.showError('Please select 2 points on the curve (click on canvas)');
        return;
    }

    const [P, Q] = selected;

    UIUtils.showLoading('operation-results', 'Computing P + Q...');

    try {
        await finiteCurveVisualizer.animatePointAddition(P, Q, (result) => {
            displayPointOperationResult({
                operation: 'Point Addition',
                P,
                Q,
                result,
                notation: 'P + Q',
            });
        });
    } catch (error) {
        console.error('Point addition failed:', error);
        UIUtils.showError('Point addition failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('operation-results');
    }
}

async function handlePointDoubling(): Promise<void> {
    if (!finiteCurveVisualizer) {
        UIUtils.showError('Finite curve visualizer not initialized');
        return;
    }

    const selected = finiteCurveVisualizer.getSelectedPoints();

    if (selected.length < 1) {
        UIUtils.showError('Please select 1 point on the curve (click on canvas)');
        return;
    }

    const P = selected[0];

    UIUtils.showLoading('operation-results', 'Computing 2P...');

    try {
        await finiteCurveVisualizer.animatePointAddition(P, P, (result) => {
            displayPointOperationResult({
                operation: 'Point Doubling',
                P,
                Q: P,
                result,
                notation: '2P',
            });
        });
    } catch (error) {
        console.error('Point doubling failed:', error);
        UIUtils.showError('Point doubling failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('operation-results');
    }
}

async function handleScalarMultiply(): Promise<void> {
    if (!finiteCurveVisualizer) {
        UIUtils.showError('Finite curve visualizer not initialized');
        return;
    }

    const selected = finiteCurveVisualizer.getSelectedPoints();

    if (selected.length < 1) {
        UIUtils.showError('Please select 1 point on the curve (click on canvas)');
        return;
    }

    const P = selected[0];

    const scalarInput = document.getElementById('scalar-input') as HTMLInputElement | null;
    if (!scalarInput || !scalarInput.value) {
        UIUtils.showError('Please enter a scalar value');
        return;
    }

    const k = BigInt(scalarInput.value);

    if (k <= 0n) {
        UIUtils.showError('Scalar must be positive');
        return;
    }

    UIUtils.showLoading('operation-results', `Computing ${k}P...`);

    try {
        await finiteCurveVisualizer.animateScalarMultiplication(k, P, (result) => {
            displayScalarMultiplyResult(k, P, result);
        });
    } catch (error) {
        console.error('Scalar multiplication failed:', error);
        UIUtils.showError('Scalar multiplication failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('operation-results');
    }
}

function handleClearSelection(): void {
    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.clearSelection();
    }

    UIUtils.clearResults('operation-results');
}

// ============================================================================
// ECDH PROTOCOL HANDLERS
// ============================================================================

async function handleECDH(): Promise<void> {
    const ecdhCurveSelect = document.getElementById('ecdh-curve-select') as HTMLSelectElement | null;
    if (!ecdhCurveSelect) return;

    const curveName = ecdhCurveSelect.value;
    const curve     = getCurve(curveName);

    if (!curve) {
        UIUtils.showError('Invalid curve selected');
        return;
    }

    UIUtils.showLoading('ecdh-results', 'Performing ECDH key exchange...');

    try {
        const ecdh = new ECDH(curve);

        const alice = ecdh.generateKeyPair();
        const bob   = ecdh.generateKeyPair();

        const aliceSecret = ecdh.computeSharedSecret(alice.privateKey, bob.publicKey);
        const bobSecret   = ecdh.computeSharedSecret(bob.privateKey, alice.publicKey);

        const aliceKey = await ecdh.deriveKey(aliceSecret, 'ECDH-Demo');
        const bobKey   = await ecdh.deriveKey(bobSecret, 'ECDH-Demo');

        displayECDHResults({
            curve,
            alice,
            bob,
            aliceSecret,
            bobSecret,
            aliceKey,
            bobKey,
        });

    } catch (error) {
        console.error('ECDH failed:', error);
        UIUtils.showError('ECDH key exchange failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('ecdh-results');
    }
}

// ============================================================================
// ECDSA PROTOCOL HANDLERS
// ============================================================================

async function handleECDSASign(): Promise<void> {
    const messageEl = document.getElementById('ecdsa-message') as HTMLInputElement | null;
    if (!messageEl) return;

    const message = messageEl.value.trim();

    if (!message) {
        UIUtils.showError('Please enter a message to sign');
        return;
    }

    const ecdsaCurveSelect = document.getElementById('ecdsa-curve-select') as HTMLSelectElement | null;
    if (!ecdsaCurveSelect) return;

    const curveName = ecdsaCurveSelect.value;
    const curve     = getCurve(curveName);

    if (!curve) {
        UIUtils.showError('Invalid curve selected');
        return;
    }

    UIUtils.showLoading('ecdsa-results', 'Generating signature...');

    try {
        const ecdsa   = new ECDSA(curve);
        const keyPair = ecdsa.generateKeyPair();

        const signature = await ecdsa.sign(message, keyPair.privateKey);

        // Store for verification step
        ecdsaState = { curve, keyPair, message, signature };

        displayECDSASignResults({ curve, message, keyPair, signature });

        // Enable verify button
        const verifyBtn = document.getElementById('ecdsa-verify-btn') as HTMLButtonElement | null;
        if (verifyBtn) verifyBtn.disabled = false;

    } catch (error) {
        console.error('ECDSA signing failed:', error);
        UIUtils.showError('Signature generation failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('ecdsa-results');
    }
}

async function handleECDSAVerify(): Promise<void> {
    if (!ecdsaState) {
        UIUtils.showError('Please sign a message first');
        return;
    }

    const { curve, keyPair, message, signature } = ecdsaState;

    const verifyMessageEl = document.getElementById('ecdsa-verify-message') as HTMLInputElement | null;
    if (!verifyMessageEl) return;

    const verifyMessage = verifyMessageEl.value.trim();

    if (!verifyMessage) {
        UIUtils.showError('Please enter a message to verify');
        return;
    }

    UIUtils.showLoading('ecdsa-verify-results', 'Verifying signature...');

    try {
        const ecdsa   = new ECDSA(curve);
        const isValid = await ecdsa.verify(verifyMessage, signature, keyPair.publicKey);

        displayECDSAVerifyResults({
            verifyMessage,
            originalMessage: message,
            signature,
            isValid,
        });

    } catch (error) {
        console.error('ECDSA verification failed:', error);
        UIUtils.showError('Signature verification failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('ecdsa-verify-results');
    }
}

export {};
