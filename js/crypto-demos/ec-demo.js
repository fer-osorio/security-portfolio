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
    displayWelcomeMessage();
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
            minX: -5,
            maxX: 5,
            minY: -5,
            maxY: 5
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
        displayRealCurveInfo(defaultRealCurve);
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
        displayFiniteCurveInfo(defaultFiniteCurve);
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
        displayRealCurveInfo(curve);
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
        displayRealCurveInfo(curve);
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
        displayFiniteCurveInfo(curve);
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
        displayFiniteCurveInfo(curve);
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
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Display real curve information (Tab 1)
 *
 * Display function for real curves only
 */
function displayRealCurveInfo(curve) {
    const infoDiv = document.getElementById('real-curve-info');
    if (!infoDiv) return;

    const { a, b } = curve;

    // Compute discriminant: Δ = -16(4a³ + 27b²)
    const discriminant = -16 * (4 * Math.pow(a, 3) + 27 * Math.pow(b, 2));

    // Determine number of components
    let components;
    if (discriminant > 0) {
        components = 'Two components (curve crosses itself)';
    } else if (discriminant < 0) {
        components = 'One component (connected curve)';
    } else {
        components = 'Singular (not a valid elliptic curve)';
    }

    let html = `
    <div class="card card--result">
    <h3>Curve Properties (Real Numbers)</h3>
    <p><strong>Equation:</strong> y² = x³ + ${a}x + ${b}</p>
    <p><strong>Discriminant (Δ):</strong> ${discriminant.toFixed(2)}</p>
    <p><strong>Structure:</strong> ${components}</p>
    `;

    if (discriminant !== 0) {
        html += `
        <p class="info"><em>
        ${discriminant < 0 ? 'This curve has one connected component extending to infinity.' :
            'This curve has two separate components.'}
            </em></p>
            `;
    } else {
        html += DisplayComponents.createSecurityAlert(
            'Singular curve! This is not a valid elliptic curve for cryptography.',
            'danger'
        );
    }

    html += DisplayComponents.createEducationalNote(
        'Over real numbers, elliptic curves form smooth curves. The geometric chord-and-tangent ' +
        'method works intuitively here. When we move to finite fields, the same algebraic formulas ' +
        'apply, but we work with discrete points instead of continuous curves.'
    );

    html += '</div>';

    UIUtils.displayResults('real-curve-info', html, false);
}

/**
 * Display finite field curve information (Tab 2)
 */
function displayFiniteCurveInfo(curve) {
    const infoDiv = document.getElementById('finite-curve-info');
    if (!infoDiv) return;

    const { a, b, p } = curve;

    let html = `
    <div class="card card--result">
        <h3>Curve Parameters (Finite Field F_${p})</h3>
        <p><strong>Equation:</strong> y² ≡ x³ + ${a}x + ${b} (mod ${p})</p>
    `;

    if (p < Config.ECC.MAX_POINT_AMOUNTn) {
        // Compute and display point count
        const points = computePointCount(curve);
        html += `<p><strong>Points on curve:</strong> ${points} (including point at infinity)</p>`;

        // Hasse's theorem bound
        const pNum = Number(p);
        const lowerBound = Math.floor(pNum + 1 - 2 * Math.sqrt(pNum));
        const upperBound = Math.ceil(pNum + 1 + 2 * Math.sqrt(pNum));
        html += `<p><strong>Hasse's theorem:</strong> ${lowerBound} ≤ #E(F_${p}) ≤ ${upperBound}</p>`;

        html += `
        <p class="info"><em>
            Click on points in the visualization above to select them for operations.
            Selected points will turn red with labels (A, B).
        </em></p>
        `;
    } else {
        html += `<p><strong>Field size:</strong> ${ECMathUtils.bitLength(p)} bits (too large to visualize)</p>`;
    }

    html += DisplayComponents.createEducationalNote(
        'For cryptographic security, we need large primes (256+ bits). ' +
        'Small curves here are for visualization and learning only.'
    );

    html += '</div>';

    UIUtils.displayResults('finite-curve-info', html, false);
}

/**
 * Compute number of points on curve
 */
function computePointCount(curve) {
    const { a, b, p } = curve;
    let count = 1; // Point at infinity

    for (let x = 0n; x < p; x++) {
        const x2 = ECMathUtils.modMul(x, x, p);
        const x3 = ECMathUtils.modMul(x2, x, p);
        const ax = ECMathUtils.modMul(a, x, p);
        const ySquared = ECMathUtils.modAdd(ECMathUtils.modAdd(x3, ax, p), b, p);

        const y = ECMathUtils.modSqrt(ySquared, p);

        if (y !== null) {
            count++; // +y
            if (y !== 0n) {
                count++; // -y
            }
        }
    }

    return count;
}

/**
 * Display welcome message
 */
function displayWelcomeMessage() {
    const welcomeDiv = document.getElementById('welcome-message');
    if (welcomeDiv) {
        welcomeDiv.innerHTML = `
        <div class="welcome-content">
            <h2>Welcome to the Elliptic Curve Explorer</h2>
            <p>Explore the mathematics of elliptic curve cryptography through interactive visualizations:</p>
            <ol>
                <li><strong>Curve Visualization:</strong> See elliptic curves over real numbers (smooth, geometric)</li>
                <li><strong>Point Operations:</strong> Work with curves over finite fields (discrete, cryptographic)</li>
                <li><strong>Protocols:</strong> Learn ECDH and ECDSA</li>
                <li><strong>Security:</strong> Understand ECDLP hardness and attacks (coming soon)</li>
        </ol>
        ${DisplayComponents.createEducationalNote(
            'Elliptic curves provide the same security as RSA with much smaller keys. ' +
            'A 256-bit ECC key ≈ 3072-bit RSA key in security strength.'
        )}
        </div>
        `;
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
            displayPointOperationResult('Point Addition', P, Q, result, 'P + Q');
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
            displayPointOperationResult('Point Doubling', P, P, result, '2P');
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
            displayScalarMultiplyResult(k, P, result);
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
// POINT OPERATION RESULT DISPLAY
// ============================================================================

/**
 * Display point operation result
 */
function displayPointOperationResult(operation, P, Q, result, notation) {
    let html = `
    <div class="card card--result">
        <h3>✓ ${operation}</h3>
        <div class="operation-display">
            <p><strong>P:</strong> (${P.x}, ${P.y})</p>
            <p><strong>Q:</strong> (${Q.x}, ${Q.y})</p>
    `;

    if (result && !result.isInfinity) {
        html += `<p><strong>${notation}:</strong> (${result.x}, ${result.y})</p>`;
    } else {
        html += `<p><strong>${notation}:</strong> ∞ (point at infinity)</p>`;
    }

    html += `
    </div>
    ${DisplayComponents.createEducationalNote(
        'Point addition is the fundamental group operation in elliptic curve cryptography. ' +
        'The geometric chord-and-tangent method corresponds to algebraic formulas over finite fields.'
    )}
    </div>
    `;

    UIUtils.displayResults('operation-results', html, true);
}

/**
 * Display scalar multiplication result
 */
function displayScalarMultiplyResult(k, P, result) {
    const binary = k.toString(2);

    let html = `
    <div class="card card--result">
        <h3>✓ Scalar Multiplication</h3>
        <div class="operation-display">
            <p><strong>Scalar k:</strong> ${k} = ${binary}₂</p>
            <p><strong>Base point P:</strong> (${P.x}, ${P.y})</p>
    `;

    if (result && !result.isInfinity) {
        html += `<p><strong>Result ${k}P:</strong> (${result.x}, ${result.y})</p>`;
    } else {
        html += `<p><strong>Result ${k}P:</strong> ∞ (point at infinity)</p>`;
    }

    html += `
        </div>
        <div class="math-breakdown">
            <h4>Algorithm: Double-and-Add</h4>
            <p>Binary representation: ${binary}</p>
            <p>Number of doublings: ${binary.length - 1}</p>
            <p>Number of additions: ${binary.split('1').length - 1}</p>
            <p>Total operations: ${binary.length - 1 + binary.split('1').length - 1}</p>
        </div>
    ${DisplayComponents.createEducationalNote(
        'Scalar multiplication is the basis of ECC security. ' +
        'Computing kP is fast (O(log k)), but finding k given P and kP is hard (ECDLP).'
    )}
    </div>
    `;

    UIUtils.displayResults('operation-results', html, true);
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
        displayECDHResults(curve, alice, bob, aliceSecret, bobSecret, aliceSessionKey, bobSessionKey);

    } catch (error) {
        console.error('ECDH failed:', error);
        UIUtils.showError('ECDH key exchange failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('ecdh-results');
    }
}

/**
 * Display ECDH results
 */
function displayECDHResults(curve, alice, bob, aliceSecret, bobSecret, aliceKey, bobKey) {
    const isSmallCurve = curve.p && curve.p < 1000n;

    let html = `
    <div class="card card--result success">
        <h3>🔐 ECDH Key Exchange Complete</h3>

        <div class="protocol-step">
            <h4>Step 1: Alice Generates Key Pair</h4>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'Private key d_A',
                    isSmallCurve ? alice.privateKey.toString() : alice.privateKey.toString(16),
                    'ecdh-alice-private',
                    false
                )}
                <p><strong>Public key Q_A = d_A × G:</strong></p>
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_A.x',
                    isSmallCurve ? alice.publicKey.x.toString() : alice.publicKey.x.toString(16),
                    'ecdh-alice-pub-x',
                    false
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_A.y',
                    isSmallCurve ? alice.publicKey.y.toString() : alice.publicKey.y.toString(16),
                    'ecdh-alice-pub-y',
                    false
                )}
            </div>
        </div>

        <div class="protocol-step">
            <h4>Step 2: Bob Generates Key Pair</h4>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'Private key d_B',
                    isSmallCurve ? bob.privateKey.toString() : bob.privateKey.toString(16),
                    'ecdh-bob-private',
                    false
                )}
                <p><strong>Public key Q_B = d_B × G:</strong></p>
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_B.x',
                    isSmallCurve ? bob.publicKey.x.toString() : bob.publicKey.x.toString(16),
                    'ecdh-bob-pub-x',
                    false
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_B.y',
                    isSmallCurve ? bob.publicKey.y.toString() : bob.publicKey.y.toString(16),
                    'ecdh-bob-pub-y',
                    false
                )}
            </div>
        </div>

        <div class="protocol-step">
            <h4>Step 3: Exchange Public Keys</h4>
            <p>Alice sends Q_A to Bob → Bob sends Q_B to Alice</p>
            <p class="alert alert--info" style="margin-top: 0.5rem;">
            ⚠️ Public keys can be transmitted over insecure channels (they're public!)
            </p>
        </div>

        <div class="protocol-step">
            <h4>Step 4: Compute Shared Secret</h4>
            <p><strong>Alice computes:</strong> S = d_A × Q_B</p>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'S.x (Alice)',
                    isSmallCurve ? aliceSecret.x.toString() : aliceSecret.x.toString(16),
                    'ecdh-alice-secret-x',
                    false
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'S.y (Alice)',
                    isSmallCurve ? aliceSecret.y.toString() : aliceSecret.y.toString(16),
                    'ecdh-alice-secret-y',
                    false
                )}
            </div>

            <p style="margin-top: 1rem;"><strong>Bob computes:</strong> S = d_B × Q_A</p>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'S.x (Bob)',
                    isSmallCurve ? bobSecret.x.toString() : bobSecret.x.toString(16),
                    'ecdh-bob-secret-x',
                    false
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'S.y (Bob)',
                    isSmallCurve ? bobSecret.y.toString() : bobSecret.y.toString(16),
                    'ecdh-bob-secret-y',
                    false
                )}
            </div>
        </div>

        <div class="protocol-step">
            <h4>Step 5: Verify Shared Secret Match</h4>
            <p class="success-message">✅ Shared secrets match: S_A = S_B</p>
            <p>This is because: d_A × Q_B = d_A × (d_B × G) = d_B × (d_A × G) = d_B × Q_A</p>
        </div>

        <div class="protocol-step">
            <h4>Step 6: Derive Session Key</h4>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'Alice\'s session key',
                    aliceKey,
                    'ecdh-alice-session',
                    true
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Bob\'s session key',
                    bobKey,
                    'ecdh-bob-session',
                    true
                )}
                <p class="success-message">✅ Session keys match!</p>
            </div>
        </div>
    </div>

    <div class="card card--control">
        <h3>🔒 Security Analysis</h3>

        <h4>What an Attacker Sees:</h4>
        <ul>
            <li>Generator point G (public parameter)</li>
            <li>Alice's public key Q_A = d_A × G</li>
            <li>Bob's public key Q_B = d_B × G</li>
        </ul>

        <h4>What an Attacker Wants:</h4>
        <p>The shared secret S = d_A × d_B × G</p>

        <h4>Why It's Hard:</h4>
        <p><strong>Elliptic Curve Discrete Logarithm Problem (ECDLP):</strong></p>
        <p>Given G and Q_A, finding d_A such that Q_A = d_A × G is computationally hard.</p>
        <ul>
            <li><strong>Best known attack:</strong> Pollard's rho with O(√n) complexity</li>
            <li><strong>For 256-bit curve:</strong> ~2^128 operations (impossible)</li>
            <li><strong>Quantum computers:</strong> Shor's algorithm reduces to O((log n)³) - still infeasible for large n</li>
        </ul>

        <h4>Man-in-the-Middle (MitM) Attack:</h4>
        ${DisplayComponents.createWarningAlert(
            'Unauthenticated ECDH Vulnerability',
            'Without authentication, an attacker can intercept and replace public keys. ' +
            'Solution: Use authenticated ECDH (sign public keys with long-term keys) or use protocols like Signal\'s X3DH.'
        )}
    </div>
    `;

    UIUtils.displayResults('ecdh-results', html, true);
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
        displayECDSASignResults(curve, message, keyPair, signature);

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
        displayECDSAVerifyResults(verifyMessage, message, signature, isValid);

    } catch (error) {
        console.error('ECDSA verification failed:', error);
        UIUtils.showError('Signature verification failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('ecdsa-verify-results');
    }
}

/**
 * Display ECDSA signing results
 */
function displayECDSASignResults(curve, message, keyPair, signature) {
    const isSmallCurve = curve.p && curve.p < 1000n;

    let html = `
    <div class="card card--result success">
        <h3>✍️ ECDSA Signature Generated</h3>

        <div class="protocol-step">
            <h4>Message to Sign</h4>
            <div class="operation-display">
                <p><strong>Plaintext:</strong> "${UIUtils.escapeHtml(message)}"</p>
                <p><strong>Length:</strong> ${message.length} characters</p>
            </div>
        </div>

        <div class="protocol-step">
            <h4>Key Pair</h4>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'Private key d',
                    isSmallCurve ? keyPair.privateKey.toString() : keyPair.privateKey.toString(16),
                    'ecdsa-private-key',
                    false
                )}
                <p><strong>Public key Q = d × G:</strong></p>
                ${DisplayComponents.createCodeValueDisplay(
                    'Q.x',
                    isSmallCurve ? keyPair.publicKey.x.toString() : keyPair.publicKey.x.toString(16),
                    'ecdsa-pub-x',
                    false
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Q.y',
                    isSmallCurve ? keyPair.publicKey.y.toString() : keyPair.publicKey.y.toString(16),
                    'ecdsa-pub-y',
                    false
                )}
            </div>
        </div>

        <div class="protocol-step">
            <h4>Signature (r, s)</h4>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'r',
                    isSmallCurve ? signature.r.toString() : signature.r.toString(16),
                    'ecdsa-sig-r',
                    true
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    's',
                    isSmallCurve ? signature.s.toString() : signature.s.toString(16),
                    'ecdsa-sig-s',
                    true
                )}
            </div>
        </div>

        <div class="protocol-step">
            <h4>Signing Algorithm (Simplified)</h4>
            <ol>
                <li>Hash message: h = H(m)</li>
                <li>Generate ephemeral key k (deterministic, RFC 6979)</li>
                <li>Compute R = k × G, then r = R.x mod n</li>
                <li>Compute s = k⁻¹(h + r·d) mod n</li>
                <li>Signature is (r, s)</li>
            </ol>
        </div>
    </div>

    <div class="card card--control">
        <h3>⚠️ Critical Security: The k-Nonce</h3>

        <p><strong>Why k must be random and unique:</strong></p>

        <div class="alert alert--error">
            <p><strong>🚨 Nonce Reuse Attack (Sony PS3 Disaster):</strong></p>
            <p>If the same k is used for two different messages:</p>
            <ul>
                <li>Attacker has: (r, s₁) for message m₁</li>
                <li>Attacker has: (r, s₂) for message m₂ (same r!)</li>
                <li>Both signatures use same k, so: s₁ - s₂ = k⁻¹(h₁ - h₂)</li>
                <li>Attacker computes: k = (h₁ - h₂) / (s₁ - s₂)</li>
                <li>Then recovers private key: d = (s·k - h) / r</li>
            </ul>
            <p><strong>Real-world impact:</strong> Sony's PS3 signing key was extracted in 2010, allowing homebrew code execution.</p>
        </div>

        <p><strong>Solution: RFC 6979 (Deterministic ECDSA)</strong></p>
        <ul>
            <li>Generate k = HMAC(privateKey, hash(message))</li>
            <li>Deterministic: Same message → same signature</li>
            <li>Unpredictable: Requires private key knowledge</li>
            <li>No randomness needed (safer for embedded devices)</li>
        </ul>
    </div>
    `;

    UIUtils.displayResults('ecdsa-results', html, true);
}

/**
 * Display ECDSA verification results
 */
function displayECDSAVerifyResults(verifyMessage, originalMessage, signature, isValid) {
    const matchesOriginal = verifyMessage === originalMessage;

    let html = `
    <div class="card card--result ${isValid ? 'success' : ''}">
        <h3>${isValid ? '✅' : '❌'} Signature Verification ${isValid ? 'Successful' : 'Failed'}</h3>

        <div class="protocol-step">
            <h4>Verification Input</h4>
            <div class="operation-display">
                <p><strong>Message to verify:</strong> "${UIUtils.escapeHtml(verifyMessage)}"</p>
                <p><strong>Original message:</strong> "${UIUtils.escapeHtml(originalMessage)}"</p>
                <p><strong>Messages match:</strong> ${matchesOriginal ? '✅ Yes' : '❌ No'}</p>
            </div>
        </div>

        <div class="protocol-step">
            <h4>Signature</h4>
            <div class="operation-display">
            ${DisplayComponents.createCodeValueDisplay(
                'r',
                signature.r.toString(16),
                'ecdsa-verify-r',
                false
            )}
            ${DisplayComponents.createCodeValueDisplay(
                's',
                signature.s.toString(16),
                'ecdsa-verify-s',
                false
            )}
        </div>
    </div>

    <div class="protocol-step">
        <h4>Verification Result</h4>
        <p class="${isValid ? 'success-message' : 'error-message'}">
        ${isValid ?
            '✅ Signature is VALID - Message authenticity confirmed' :
            '❌ Signature is INVALID - Message may be tampered or wrong key'
        }
        </p>
    </div>

    <div class="protocol-step">
        <h4>Verification Algorithm</h4>
        <ol>
            <li>Hash message: h = H(m)</li>
            <li>Compute w = s⁻¹ mod n</li>
            <li>Compute u₁ = h·w mod n</li>
            <li>Compute u₂ = r·w mod n</li>
            <li>Compute R' = u₁·G + u₂·Q</li>
            <li>Accept if R'.x ≡ r (mod n)</li>
        </ol>

        <p><strong>Why this works:</strong></p>
        <p>R' = u₁·G + u₂·Q = (h·w)·G + (r·w)·Q</p>
        <p>   = w·(h·G + r·Q) = w·(h·G + r·d·G)</p>
        <p>   = w·(h + r·d)·G</p>
        <p>   = s⁻¹·(h + r·d)·G</p>
        <p>   = k·G  [since s = k⁻¹(h + r·d)]</p>
        <p>   = R (the original point used in signing)</p>
        </div>
    </div>
    `;

    if (!matchesOriginal && isValid) {
        html += DisplayComponents.createWarningAlert(
            'Unexpected Result',
            'Signature verified but messages don\'t match - this shouldn\'t happen with deterministic ECDSA!'
        );
    }

    if (matchesOriginal && !isValid) {
        html += DisplayComponents.createWarningAlert(
            'Verification Failed',
            'Messages match but signature invalid - possible implementation error or key mismatch.'
        );
    }

    UIUtils.displayResults('ecdsa-verify-results', html, true);
}

