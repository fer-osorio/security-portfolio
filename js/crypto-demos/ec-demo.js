/**
 * ============================================================================
 * ELLIPTIC CURVE EXPLORER - UI CONTROLLER
 *
 * This module handles all user interactions and updates the DOM.
 * Acts as the "controller" in MVC architecture.
 *
 * ARCHITECTURE:
 * - Uses shared UIUtils for common DOM operations
 * - Uses DisplayComponents for consistent HTML generation
 * - Uses Config for all constants and configuration
 * - ECC-specific logic (curve selection, point operations, visualization)
 *
 * ============================================================================
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentCurve = null;
let visualizer = null;
let currentMode = 'finite';

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

    // Initialize visualizer
    initializeVisualizer();

    // Load default curve
    loadDefaultCurve();

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
    // Curve selection
    const curveSelect = document.getElementById('curve-select');
    if (curveSelect) {
        curveSelect.addEventListener('change', handleCurveChange);
    }

    // Visualization mode toggle
    const modeButtons = document.querySelectorAll('input[name="viz-mode"]');
    modeButtons.forEach(button => {
        button.addEventListener('change', handleModeChange);
    });

    // Custom curve toggle
    const customToggle = document.getElementById('custom-curve-toggle');
    if (customToggle) {
        customToggle.addEventListener('change', handleCustomCurveToggle);
    }

    // Point operation buttons
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
 * Initialize canvas visualizer
 */
function initializeVisualizer() {
    try {
        visualizer = new ECVisualizer('ec-canvas', {
            mode: currentMode,
            minX: -1,
            maxX: 30,
            minY: -1,
            maxY: 30
        });
        console.log('Visualizer initialized');
    } catch (error) {
        console.error('Failed to initialize visualizer:', error);
        UIUtils.showError('Failed to initialize visualization canvas');
    }
}

/**
 * Load default curve on startup
 */
function loadDefaultCurve() {
    const defaultCurveName = Config.ECC.DEFAULT_CURVE;
    const curve = ECCore.getCurve(defaultCurveName);

    if (curve) {
        // For visualization, use small test curve
        currentCurve = {
            name: 'Test Curve (p=23)',
            a: 0n,
            b: 7n,
            p: 23n
        };

        if (visualizer) {
            visualizer.setCurve(currentCurve);
        }

        displayCurveInfo(currentCurve);
    }
}

// ============================================================================
// CURVE MANAGEMENT HANDLERS
// ============================================================================

/**
 * Handle curve selection change
 */
function handleCurveChange() {
    const curveSelect = document.getElementById('curve-select');
    const curveName = curveSelect.value;

    if (curveName === 'custom') {
        handleCustomCurveToggle();
        return;
    }

    if (curveName === 'test-small') {
        // Small test curve for visualization
        currentCurve = {
            name: 'Test Curve (p=23)',
            a: 0n,
            b: 7n,
            p: 23n
        };
    } else if (curveName === 'test-medium') {
        currentCurve = {
            name: 'Test Curve (p=97)',
            a: 2n,
            b: 3n,
            p: 97n
        };
    } else {
        // Standard curve
        const standardCurve = ECCore.getCurve(curveName);
        if (standardCurve) {
            currentCurve = standardCurve;
            UIUtils.showWarning('Large curve selected - visualization limited to parameters only');
        }
    }

    if (visualizer && currentCurve.p && currentCurve.p < 1000n) {
        visualizer.setCurve(currentCurve);
    }

    displayCurveInfo(currentCurve);
}

/**
 * Handle visualization mode change
 */
function handleModeChange(event) {
    currentMode = event.target.value;

    if (visualizer) {
        visualizer.setMode(currentMode);
    }

    // Update UI hints
    const hint = document.getElementById('mode-hint');
    if (hint) {
        if (currentMode === 'real') {
            hint.textContent = 'Viewing curve over real numbers (smooth, continuous)';
        } else {
            hint.textContent = 'Viewing curve over finite field (discrete points)';
        }
    }
}

/**
 * Handle custom curve toggle
 */
function handleCustomCurveToggle() {
    const customSection = document.getElementById('custom-curve-params');
    const isChecked = document.getElementById('custom-curve-toggle')?.checked;

    if (customSection) {
        customSection.style.display = isChecked ? 'block' : 'none';
    }
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Display curve information
 *
 * @param {Object} curve - Curve parameters
 */
function displayCurveInfo(curve) {
    const infoDiv = document.getElementById('curve-info');
    if (!infoDiv) return;

    const { a, b, p } = curve;

    let html = `
    <div class="card card--result">
        <h3>Curve Parameters</h3>
    <p><strong>Equation:</strong> y² ≡ x³ + ${a}x + ${b} (mod ${p})</p>
    `;

    if (p < 1000n) {
        // Compute and display point count
        const points = computePointCount(curve);
        html += `<p><strong>Points on curve:</strong> ${points} (including point at infinity)</p>`;

        // Hasse's theorem bound
        const pNum = Number(p);
        const lowerBound = Math.floor(pNum + 1 - 2 * Math.sqrt(pNum));
        const upperBound = Math.ceil(pNum + 1 + 2 * Math.sqrt(pNum));
        html += `<p><strong>Hasse's theorem:</strong> ${lowerBound} ≤ #E(F_${p}) ≤ ${upperBound}</p>`;
    } else {
        html += `<p><strong>Field size:</strong> ${ECMathUtils.bitLength(p)} bits</p>`;

        if (curve.n) {
            html += `<p><strong>Group order:</strong> ${ECMathUtils.bitLength(curve.n)} bits</p>`;
            html += `<p><strong>Cofactor:</strong> ${curve.h}</p>`;
        }
    }

    html += DisplayComponents.createEducationalNote(
        'For cryptographic security, we need large primes (256+ bits). ' +
        'Small curves here are for visualization and learning only.'
    );

    html += '</div>';

    UIUtils.displayResults('curve-info', html, false);
}

/**
 * Compute number of points on curve
 *
 * @param {Object} curve - {a, b, p}
 * @returns {Number} - Point count including infinity
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
        <li><strong>Visualize:</strong> See curves over real numbers or finite fields</li>
        <li><strong>Interact:</strong> Click points on the curve to select them</li>
        <li><strong>Compute:</strong> Perform point addition and scalar multiplication</li>
        <li><strong>Learn:</strong> Understand the geometric and algebraic foundations of ECC</li>
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
// POINT OPERATION HANDLERS
// ============================================================================

/**
 * Handle point addition
 */
async function handlePointAddition() {
    if (!visualizer) {
        UIUtils.showError('Visualizer not initialized');
        return;
    }

    const selected = visualizer.getSelectedPoints();

    if (selected.length < 2) {
        UIUtils.showError('Please select 2 points on the curve (click on canvas)');
        return;
    }

    const [P, Q] = selected;

    UIUtils.showLoading('operation-results', 'Computing P + Q...');

    try {
        await visualizer.animatePointAddition(P, Q, (result) => {
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
    if (!visualizer) {
        UIUtils.showError('Visualizer not initialized');
        return;
    }

    const selected = visualizer.getSelectedPoints();

    if (selected.length < 1) {
        UIUtils.showError('Please select 1 point on the curve (click on canvas)');
        return;
    }

    const P = selected[0];

    UIUtils.showLoading('operation-results', 'Computing 2P...');

    try {
        await visualizer.animatePointAddition(P, P, (result) => {
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
    if (!visualizer) {
        UIUtils.showError('Visualizer not initialized');
        return;
    }

    const selected = visualizer.getSelectedPoints();

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
        await visualizer.animateScalarMultiplication(k, P, (result) => {
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
    if (visualizer) {
        visualizer.clearSelection();
    }

    UIUtils.clearResults('operation-results');
}

// ============================================================================
// RESULT DISPLAY
// ============================================================================

/**
 * Display point operation result
 *
 * @param {String} operation - Operation name
 * @param {Object} P - First point
 * @param {Object} Q - Second point
 * @param {Object} result - Result point
 * @param {String} notation - Mathematical notation
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
 *
 * @param {BigInt} k - Scalar
 * @param {Object} P - Base point
 * @param {Object} result - Result point
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
