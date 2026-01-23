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
 *
 * UNCHANGED: Same function as before
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
        <li><strong>Protocols:</strong> Learn ECDH and ECDSA (coming in Phase 3)</li>
        <li><strong>Security:</strong> Understand ECDLP hardness and attacks (coming in Phase 4)</li>
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
// RESULT DISPLAY (UNCHANGED)
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
