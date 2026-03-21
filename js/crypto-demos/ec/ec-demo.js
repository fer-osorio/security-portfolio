/**
 * ============================================================================
 * ELLIPTIC CURVE EXPLORER - UI CONTROLLER (REFACTORED)
 *
 * REFACTORING CHANGES:
 * 1. Separated real curve visualization (Tab 1) from finite field (Tab 2)
 * 2. Created two separate canvas visualizers (one per tab)
 * 3. Removed mode toggle - each tab has dedicated mode
 * 4. Simplified curve selectors - only appropriate curves per tab
 * 5. Co-located finite field visualization with point operations
 *
 * This module handles all user interactions and updates the DOM.
 * Acts as the "controller" in MVC architecture.
 *
 * ============================================================================
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

// Two separate visualizers instead of one with mode toggle
let realCurveVisualizer = null;      // Tab 1: Real number curves
let finiteCurveVisualizer = null;    // Tab 2: Finite field curves
let currentFiniteCurve = null;       // Currently selected finite field curve

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the ECC demo when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('ECC Explorer initialized');

    // Set up event listeners
    setupEventListeners();

    // Initialize both visualizers
    initializeVisualizers();

    // Load default curves
    loadDefaultCurves();

    // Display welcome message
    ECDisplay.displayWelcomeMessage();
});

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

/**
 * Set up all event listeners for user interactions
 */
function setupEventListeners() {
    // Separate curve selectors for each tab

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
    const realCustomInputs = ['real-a', 'real-b'];
    realCustomInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', handleRealCustomCurve);
        }
    });

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
    const ecdsaMessage = document.getElementById('ecdsa-message');
    const ecdsaVerifyMessage = document.getElementById('ecdsa-verify-message');
    if (ecdsaMessage && ecdsaVerifyMessage) {
        ecdsaMessage.addEventListener('input', () => {
            ecdsaVerifyMessage.value = ecdsaMessage.value;
        });
    }

    // Use shared utilities for common patterns
    UIUtils.setupCopyButtons();
    UIUtils.setupTabs();
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

/**
 * Initialize both canvas visualizers
 */
function initializeVisualizers() {
    // Tab 1: Real curve visualizer
    try {
        realCurveVisualizer = new ECVisualizer('real-curve-canvas', {
            mode: 'real',  // Fixed mode
            minX: -8,
            maxX: 8,
            minY: -8,
            maxY: 8
        });
        console.log('Real curve visualizer initialized');
    } catch (error) {
        console.error('Failed to initialize real curve visualizer:', error);
    }

    // Tab 2: Finite field visualizer (in hidden tab initially)
    try {
        finiteCurveVisualizer = new ECVisualizer('finite-curve-canvas', {
            mode: 'finite',  // Fixed mode
            minX: -1,
            maxX: 30,
            minY: -1,
            maxY: 30
        });
        console.log('Finite curve visualizer initialized (will resize when tab becomes visible)');
    } catch (error) {
        console.error('Failed to initialize finite curve visualizer:', error);
    }
}

/**
 * Load default curves on startup
 *
 * Load appropriate default for each tab
 */
function loadDefaultCurves() {
    // Tab 1: Default real curve (y² = x³ + 7, like secp256k1)
    const defaultRealCurve = {
        name: 'y² = x³ + 7',
        a: 0,
        b: 7
    };

    if (realCurveVisualizer) {
        realCurveVisualizer.setCurve(defaultRealCurve);
        ECDisplay.displayRealCurveInfo(defaultRealCurve);
    }

    // Tab 2: Default finite field curve (small for visualization)
    const defaultFiniteCurve = {
        name: 'E(F₂₃): y² = x³ + 7',
        a: 0n,
        b: 7n,
        p: 23n
    };

    currentFiniteCurve = defaultFiniteCurve;

    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.setCurve(defaultFiniteCurve);
        ECDisplay.displayFiniteCurveInfo(defaultFiniteCurve);
    }
}

// ============================================================================
// TAB 1: REAL CURVE HANDLERS
// ============================================================================

/**
 * Handle real curve selection change
 *
 * Handler for Tab 1 only
 */
function handleRealCurveChange() {
    const select = document.getElementById('real-curve-select');
    const value = select.value;

    let curve;

    switch(value) {
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
    }

    if (realCurveVisualizer) {
        realCurveVisualizer.setCurve(curve);
        ECDisplay.displayRealCurveInfo(curve);
    }
}

/**
 * Handle custom real curve parameter changes
 *
 * Handler for Tab 1 custom curves
 */
function handleRealCustomCurve() {
    const a = parseFloat(document.getElementById('real-a').value) || 0;
    const b = parseFloat(document.getElementById('real-b').value) || 0;

    // Update display values
    document.getElementById('real-a-value').textContent = a;
    document.getElementById('real-b-value').textContent = b;

    const curve = {
        name: `y² = x³ + ${a}x + ${b}`,
        a: a,
        b: b
    };

    if (realCurveVisualizer) {
        realCurveVisualizer.setCurve(curve);
        ECDisplay.displayRealCurveInfo(curve);
    }
}

/**
 * Show custom real curve parameter controls
 */
function showCustomRealParams() {
    const customDiv = document.getElementById('custom-real-params');
    if (customDiv) {
        customDiv.style.display = 'block';
    }
}

/**
 * Hide custom real curve parameter controls
 */
function hideCustomRealParams() {
    const customDiv = document.getElementById('custom-real-params');
    if (customDiv) {
        customDiv.style.display = 'none';
    }
}

// ============================================================================
// TAB 2: FINITE FIELD CURVE HANDLERS
// ============================================================================

/**
 * Handle finite field curve selection change
 *
 * Handler for Tab 2 only
 */
function handleFiniteCurveChange() {
    const select = document.getElementById('finite-curve-select');
    const value = select.value;

    let curve;

    switch(value) {
        case 'test-23':
            curve = {
                name: 'E(F₂₃): y² = x³ + 7',
                a: 0n,
                b: 7n,
                p: 23n
            };
            hideCustomFiniteParams();
            break;
        case 'test-97':
            curve = {
                name: 'E(F₉₇): y² = x³ + 2x + 3',
                a: 2n,
                b: 3n,
                p: 97n
            };
            hideCustomFiniteParams();
            break;
        case 'custom':
            showCustomFiniteParams();
            return;
    }

    currentFiniteCurve = curve;

    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.setCurve(curve);
        ECDisplay.displayFiniteCurveInfo(curve);
    }
}

/**
 * Handle custom finite field curve application
 *
 * Handler for Tab 2 custom curves
 */
function handleFiniteCustomCurve() {
    const a = BigInt(document.getElementById('finite-a').value || 0);
    const b = BigInt(document.getElementById('finite-b').value || 0);
    const p = BigInt(document.getElementById('finite-p').value || 23);

    // Validate prime (basic check)
    if (p < 2n) {
        UIUtils.showError('Prime p must be at least 2');
        return;
    }

    if (p > Config.ECC.MAX_POINT_AMOUNTn) {
        UIUtils.showWarning('Large primes may not visualize well');
    }

    // If number p is not a prime, disable point operations; enable them otherwise
    if(MathUtils.isDivisibleBySmallPrime(p)){
        document.getElementById("point-add-btn").disabled = true;
        document.getElementById("point-double-btn").disabled = true;
        document.getElementById('scalar-input').disabled = true;
        document.getElementById("scalar-multiply-btn").disabled = true;
        document.getElementById("clear-selection-btn").disabled = true;
        UIUtils.showError('Provided number p is not a prime, point operations are disabled');
    } else {
        document.getElementById("point-add-btn").disabled = false;
        document.getElementById("point-double-btn").disabled = false;
        document.getElementById('scalar-input').disabled = false;
        document.getElementById("scalar-multiply-btn").disabled = false;
        document.getElementById("clear-selection-btn").disabled = false;
    }

    const curve = {
        name: `E(F₍${p}₎): y² = x³ + ${a}x + ${b}`,
        a: a,
        b: b,
        p: p
    };

    currentFiniteCurve = curve;

    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.setCurve(curve);
        ECDisplay.displayFiniteCurveInfo(curve);
    }
}

/**
 * Show custom finite curve parameter controls
 */
function showCustomFiniteParams() {
    const customDiv = document.getElementById('custom-finite-params');
    if (customDiv) {
        customDiv.style.display = 'block';
    }
}

/**
 * Hide custom finite curve parameter controls
 */
function hideCustomFiniteParams() {
    const customDiv = document.getElementById('custom-finite-params');
    if (customDiv) {
        customDiv.style.display = 'none';
    }
}

// ============================================================================
// POINT OPERATION HANDLERS (TAB 2 ONLY)
// ============================================================================

/**
 * Handle point addition
 */
async function handlePointAddition() {
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
            ECDisplay.displayPointOperationResult('Point Addition', P, Q, result, 'P + Q');
        });
    } catch (error) {
        console.error('Point addition failed:', error);
        UIUtils.showError('Point addition failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('operation-results');
    }
}

/**
 * Handle point doubling
 */
async function handlePointDoubling() {
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
            ECDisplay.displayPointOperationResult('Point Doubling', P, P, result, '2P');
        });
    } catch (error) {
        console.error('Point doubling failed:', error);
        UIUtils.showError('Point doubling failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('operation-results');
    }
}

/**
 * Handle scalar multiplication
 */
async function handleScalarMultiply() {
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

    // Get scalar from input
    const scalarInput = document.getElementById('scalar-input');
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
            ECDisplay.displayScalarMultiplyResult(k, P, result);
        });
    } catch (error) {
        console.error('Scalar multiplication failed:', error);
        UIUtils.showError('Scalar multiplication failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('operation-results');
    }
}

/**
 * Handle clear selection
 */
function handleClearSelection() {
    if (finiteCurveVisualizer) {
        finiteCurveVisualizer.clearSelection();
    }

    UIUtils.clearResults('operation-results');
}

// ============================================================================
// ECDH PROTOCOL HANDLERS
// ============================================================================

/**
 * Handle ECDH demonstration
 */
async function handleECDH() {
    // Get curve selection
    const ecdhCurveSelect = document.getElementById('ecdh-curve-select');
    const curveName = ecdhCurveSelect.value;

    let curve;
    if (curveName === 'test-small') {
        curve = { name: 'Test (p=23)', a: 0n, b: 7n, p: 23n, n: 28n, h: 1n };
        // Need to set generator
        curve.G = new ECMathUtils.Point(6n, 4n, curve);
    } else {
        curve = ECCore.getCurve(curveName);
    }

    if (!curve) {
        UIUtils.showError('Invalid curve selected');
        return;
    }

    UIUtils.showLoading('ecdh-results', 'Performing ECDH key exchange...');

    try {
        const ecdh = new ECCore.ECDH(curve);

        // Alice generates keys
        const alice = ecdh.generateKeyPair();

        // Bob generates keys
        const bob = ecdh.generateKeyPair();

        // Compute shared secrets
        const aliceSecret = ecdh.computeSharedSecret(alice.privateKey, bob.publicKey);
        const bobSecret = ecdh.computeSharedSecret(bob.privateKey, alice.publicKey);

        // Derive session keys
        const aliceSessionKey = await ecdh.deriveKey(aliceSecret, 'ECDH-Demo');
        const bobSessionKey = await ecdh.deriveKey(bobSecret, 'ECDH-Demo');

        // Display results
        ECDisplay.displayECDHResults(curve, alice, bob, aliceSecret, bobSecret, aliceSessionKey, bobSessionKey);

    } catch (error) {
        console.error('ECDH failed:', error);
        UIUtils.showError('ECDH key exchange failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('ecdh-results');
    }
}

// ============================================================================
// ECDSA PROTOCOL HANDLERS
// ============================================================================

/**
 * Handle ECDSA signing
 */
async function handleECDSASign() {
    const message = document.getElementById('ecdsa-message').value.trim();

    if (!message) {
        UIUtils.showError('Please enter a message to sign');
        return;
    }

    // Get curve selection
    const ecdsaCurveSelect = document.getElementById('ecdsa-curve-select');
    const curveName = ecdsaCurveSelect.value;

    let curve;
    if (curveName === 'test-small') {
        curve = { name: 'Test (p=23)', a: 0n, b: 7n, p: 23n, n: 28n, h: 1n };
        curve.G = new ECMathUtils.Point(5n, 4n, curve);
    } else {
        curve = ECCore.getCurve(curveName);
    }

    if (!curve) {
        UIUtils.showError('Invalid curve selected');
        return;
    }

    UIUtils.showLoading('ecdsa-results', 'Generating signature...');

    try {
        const ecdsa = new ECCore.ECDSA(curve);

        // Generate key pair
        const keyPair = ecdsa.generateKeyPair();

        // Sign message
        const signature = await ecdsa.sign(message, keyPair.privateKey);

        // Store for verification
        window.ecdsaState = {
            curve,
            keyPair,
            message,
            signature
        };

        // Display signing results
        ECDisplay.displayECDSASignResults(curve, message, keyPair, signature);

        // Enable verify button
        const verifyBtn = document.getElementById('ecdsa-verify-btn');
        if (verifyBtn) verifyBtn.disabled = false;

    } catch (error) {
        console.error('ECDSA signing failed:', error);
        UIUtils.showError('Signature generation failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('ecdsa-results');
    }
}

/**
 * Handle ECDSA verification
 */
async function handleECDSAVerify() {
    if (!window.ecdsaState) {
        UIUtils.showError('Please sign a message first');
        return;
    }

    const { curve, keyPair, message, signature } = window.ecdsaState;

    // Get verification message (may be different)
    const verifyMessage = document.getElementById('ecdsa-verify-message').value.trim();

    if (!verifyMessage) {
        UIUtils.showError('Please enter a message to verify');
        return;
    }

    UIUtils.showLoading('ecdsa-verify-results', 'Verifying signature...');

    try {
        const ecdsa = new ECCore.ECDSA(curve);

        // Verify signature
        const isValid = await ecdsa.verify(verifyMessage, signature, keyPair.publicKey);

        // Display verification results
        ECDisplay.displayECDSAVerifyResults(verifyMessage, message, signature, isValid);

    } catch (error) {
        console.error('ECDSA verification failed:', error);
        UIUtils.showError('Signature verification failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('ecdsa-verify-results');
    }
}
