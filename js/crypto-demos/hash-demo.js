/**
 * ============================================================================
 * HASH FUNCTION VISUALIZER - UI CONTROLLER
 *
 * This module handles all user interactions and DOM updates for the
 * hash function visualization tool.
 *
 * ARCHITECTURE: MVC pattern
 * - Model: hash-core.js (hash computations)
 * - View: hash-tool.html (DOM structure)
 * - Controller: this file (event handling, UI updates)
 *
 * - Uses shared UIUtils for common DOM operations
 * - Uses DisplayComponents for consistent HTML generation
 * - Uses Config for all constants and configuration
 * - Hash-specific logic (avalanche visualization, birthday calculations)
 *
 * ============================================================================
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentHashes = {};
let lastInput = '';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the hash demo when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hash Visualizer initialized');

    // Check dependencies
    checkDependencies();

    // Set up event listeners
    setupEventListeners();

    // Display welcome message
    displayWelcomeMessage();
});

// ============================================================================
// DEPENDENCY CHECKING
// ============================================================================

/**
 * Check if required libraries are loaded
 */
function checkDependencies() {
    if (!HashCore.isCryptoJSAvailable()) {
        console.warn('⚠️ CryptoJS not loaded. MD5 and SHA-3 will not be available.');
        UIUtils.showWarning('Some hash functions (MD5, SHA-3) require CryptoJS library.');
    }
}

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Hash computation
    const computeBtn = document.getElementById('compute-hash-btn');
    if (computeBtn) {
        computeBtn.addEventListener('click', handleComputeHash);
    }

    // Avalanche effect
    const avalancheBtn = document.getElementById('avalanche-btn');
    if (avalancheBtn) {
        avalancheBtn.addEventListener('click', handleAvalanche);
    }

    // Birthday attack calculator
    const birthdayBtn = document.getElementById('birthday-calc-btn');
    if (birthdayBtn) {
        birthdayBtn.addEventListener('click', handleBirthdayCalculator);
    }

    // Use shared utilities for common patterns
    UIUtils.setupCopyButtons();
    UIUtils.setupTabs();
}

// ============================================================================
// HASH COMPUTATION HANDLERS
// ============================================================================

/**
 * Handle hash computation
 */
async function handleComputeHash() {
    const input = document.getElementById('hash-input').value;
    const selectedAlgos = getSelectedAlgorithms();

    if (!input) {
        UIUtils.showError('Please enter text to hash');
        return;
    }

    if (selectedAlgos.length === 0) {
        UIUtils.showError('Please select at least one hash algorithm');
        return;
    }

    // Clear previous results
    UIUtils.clearResults('hash-results');

    // Show loading indicator
    UIUtils.showLoading('hash-results', 'Computing hashes...');

    try {
        const startTime = performance.now();
        const results = {};

        // Compute hashes for all selected algorithms
        for (const algo of selectedAlgos) {
            const algoStartTime = performance.now();
            const hash = await HashCore.computeHash(input, algo);
            const algoEndTime = performance.now();

            results[algo] = {
                hash,
                time: (algoEndTime - algoStartTime).toFixed(2)
            };
        }

        const endTime = performance.now();
        const totalTime = (endTime - startTime).toFixed(2);

        // Store results
        currentHashes = results;
        lastInput = input;

        // Display results
        displayHashResults(input, results, totalTime);

    } catch (error) {
        console.error('Hash computation failed:', error);
        UIUtils.showError('Hash computation failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('hash-results');
    }
}

/**
 * Get selected hash algorithms from checkboxes
 */
function getSelectedAlgorithms() {
    const checkboxes = document.querySelectorAll('input[name="hash-algorithm"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Display hash computation results
 */
function displayHashResults(input, results, totalTime) {
    let html = `
    <div class="hash-results-container">
        <h3>✓ Hash Computation Complete (${totalTime}ms)</h3>

        <div class="input-display">
            <h4>Input</h4>
            <p class="input-text">"${UIUtils.escapeHtml(input)}"</p>
            <p class="input-info">Length: ${input.length} characters (${new Blob([input]).size} bytes)</p>
        </div>

    <div class="hash-outputs">
    `;

    // Display each algorithm's result using DisplayComponents
    for (const [algo, data] of Object.entries(results)) {
        html += DisplayComponents.createHashOutputDisplay({
            algorithm: algo,
            hash: data.hash,
            time: data.time,
            showBinary: true
        });
    }

    html += '</div></div>';

    UIUtils.displayResults('hash-results', html, true);
    UIUtils.setupCopyButtons();
}

// ============================================================================
// AVALANCHE EFFECT HANDLERS
// ============================================================================

/**
 * Handle avalanche effect demonstration
 */
async function handleAvalanche() {
    const baseInput = document.getElementById('avalanche-input').value;
    const algorithm = document.getElementById('avalanche-algorithm').value;

    if (!baseInput) {
        UIUtils.showError('Please enter base text for avalanche test');
        return;
    }

    UIUtils.clearResults('avalanche-results');
    UIUtils.showLoading('avalanche-results', 'Computing avalanche effect...');

    try {
        // Compute hash of original input
        const originalHash = await HashCore.computeHash(baseInput, algorithm);

        // Create modified input (flip last bit)
        const modifiedInput = baseInput.slice(0, -1) +
        String.fromCharCode(
            // The following condition prevents the presence of the non-printable character DEL
            // Notice: Still one and only one bit flipped
            baseInput.charAt(baseInput.length - 1) === '~' ? 124
            : baseInput.charCodeAt(baseInput.length - 1) ^ 1
        );

        // Compute hash of modified input
        const modifiedHash = await HashCore.computeHash(modifiedInput, algorithm);

        // Calculate avalanche effect
        const avalanche = HashUtils.computeAvalanche(originalHash, modifiedHash);

        // Display results
        displayAvalancheResults(baseInput, modifiedInput, originalHash, modifiedHash, avalanche, algorithm);

    } catch (error) {
        console.error('Avalanche test failed:', error);
        UIUtils.showError('Avalanche test failed: ' + error.message);
    } finally {
        UIUtils.hideLoading('avalanche-results');
    }
}

/**
 * Display avalanche effect results
 *
 * REFACTORED: Now uses DisplayComponents for consistent HTML generation
 */
function displayAvalancheResults(original, modified, hash1, hash2, avalanche, algorithm) {
    const binary1 = HashUtils.hexToBinary(hash1);
    const binary2 = HashUtils.hexToBinary(hash2);
    const bitDiff = HashUtils.generateBitDiff(binary1, binary2);

    const info = Config.getAlgorithmInfo(algorithm);

    // Evaluate avalanche quality
    const percentage = parseFloat(avalanche.percentage);
    let quality, color;
    if (percentage >= 45 && percentage <= 55) {
        quality = 'Excellent';
        color = 'green';
    } else if (percentage >= 40 && percentage <= 60) {
        quality = 'Good';
        color = 'blue';
    } else {
        quality = 'Poor';
        color = 'red';
    }

    // Build HTML using DisplayComponents
    let html = `
    <div class="avalanche-container">
        <h3>✓ Avalanche Effect Analysis</h3>
        <p class="algorithm-name">Algorithm: ${info.name}</p>
    `;

    // Use DisplayComponents for comparison display
    html += DisplayComponents.createComparisonDisplay({
        original: {
            title: 'Original Input',
            content: `
            <code class="input-display">"${UIUtils.escapeHtml(original)}"</code>
            <p class="hash-label">Hash:</p>
            <code class="hash-small">${hash1}</code>
            `
        },
        modified: {
            title: 'Modified Input (last bit flipped)',
            content: `
                <code class="input-display">"${UIUtils.escapeHtml(modified)}"</code>
                <p class="hash-label">Hash:</p>
                <code class="hash-small">${hash2}</code>
            `
        }
    });

    // Use DisplayComponents for avalanche summary
    html += DisplayComponents.createAvalancheSummary(avalanche, quality);

    // Use DisplayComponents for bit visualization
    html += `
    <div class="bit-visualization">
        <h4>Bit-Level Comparison</h4>
        ${DisplayComponents.createBitVisualization(bitDiff)}
    </div>
    `;

    html += '</div>';

    UIUtils.displayResults('avalanche-results', html, true);
}

// ============================================================================
// BIRTHDAY ATTACK HANDLERS
// ============================================================================

/**
 * Handle birthday attack calculator
 */
function handleBirthdayCalculator() {
    const algorithm = document.getElementById('birthday-algorithm').value;
    const info = Config.getAlgorithmInfo(algorithm);

    if (!info) {
        UIUtils.showError('Invalid algorithm selected');
        return;
    }

    const hashBits = info.outputBits;

    // Calculate various probabilities
    const attempts50 = HashUtils.attemptsFor50PercentCollision(hashBits);

    // Sample probabilities at different attempt counts
    const probabilities = [
        { attempts: Math.pow(2, hashBits / 4), label: `2^${hashBits / 4}` },
        { attempts: Math.pow(2, hashBits / 3), label: `2^${(hashBits / 3).toFixed(1)}` },
        { attempts: Math.pow(2, hashBits / 2), label: `2^${hashBits / 2}` },
        { attempts: Math.pow(2, hashBits / 1.5), label: `2^${(hashBits / 1.5).toFixed(1)}` }
    ].map(item => {
        const probability = HashUtils.birthdayAttackProbability(hashBits, item.attempts) * 100;

        // Determine security assessment
        let assessment;
        if (probability < 0.000001) {
            assessment = '<span class="secure">✅ Effectively Impossible</span>';
        } else if (probability < 0.01) {
            assessment = '<span class="secure">✅ Highly Secure</span>';
        } else if (probability < 10) {
            assessment = '<span class="warning">⚠️ Possible with Resources</span>';
        } else {
            assessment = '<span class="insecure">⛔ Practical Attack</span>';
        }

        return {
            ...item,
            probability,
            assessment
        };
    });

    displayBirthdayResults(info, attempts50, probabilities);
}

/**
 * Display birthday attack calculator results
 */
function displayBirthdayResults(info, attempts50, probabilities) {
    let html = `
    <div class="birthday-container">
        <h3>🎂 Birthday Attack Analysis</h3>
        <p class="algorithm-name">Algorithm: ${info.name} (${info.outputBits}-bit output)</p>

        <div class="birthday-explanation">
            <h4>What is a Birthday Attack?</h4>
            <p>
                The birthday paradox states that in a group of just 23 people,
                there's a 50% chance two share a birthday. This applies to hash collisions!
            </p>
            <p>
                For an n-bit hash, you need approximately <strong>2^(n/2)</strong> attempts
                to find a collision with 50% probability.
            </p>
        </div>

        <div class="birthday-stats">
            <h4>Collision Probability</h4>
            <p class="attempts-50">
                <strong>50% collision probability:</strong> ${attempts50} attempts
            </p>

            ${DisplayComponents.createBirthdayProbabilityTable(probabilities)}
        </div>

        <div class="real-world-context">
            <h4>Real-World Context</h4>
            <p>
                <strong>Bitcoin mining:</strong> ~500 exahashes/second globally
                (500 × 10^18 hashes/second)
            </p>
            <p>
                <strong>Time to 50% collision for ${info.name} (assume 1 billion hashes/second):</strong>
                ${estimateCollisionTime(info.outputBits)} years
            </p>
            <p class="conclusion">
                ${info.outputBits >= 256 ?
                '✅ Collision-resistant in practice (more time than age of universe)' :
                '⚠️ May be vulnerable with sufficient computational resources'}
            </p>
        </div>
    </div>
    `;

    UIUtils.displayResults('birthday-results', html, true);
}

/**
 * Estimate time to find collision
 *
 * HASH-SPECIFIC: This calculation is specific to birthday attack analysis
 */
function estimateCollisionTime(hashBits) {
    // Assume 1 billion hashes/second (aggressive estimate)
    const hashesPerSecond = 1e9;
    const attemptsNeeded = Math.pow(2, hashBits / 2);
    const secondsNeeded = attemptsNeeded / hashesPerSecond;
    const yearsNeeded = secondsNeeded / (365.25 * 24 * 3600);

    if (yearsNeeded > 1e20) {
        return '> 10^20 (far exceeds age of universe)';
    } else if (yearsNeeded > 1e10) {
        return yearsNeeded.toExponential(2);
    } else {
        return HashUtils.formatLargeNumber(yearsNeeded);
    }
}

// ============================================================================
// INITIAL DISPLAY
// ============================================================================

/**
 * Display welcome message
 *
 * HASH-SPECIFIC: Welcome content is tool-specific, stays in this file
 */
function displayWelcomeMessage() {
    const welcomeDiv = document.getElementById('welcome-message');
    if (welcomeDiv) {
        welcomeDiv.innerHTML = `
        <div class="welcome-content">
            <h2>Welcome to the Hash Function Visualizer</h2>
            <p>Explore cryptographic hash functions through interactive demonstrations:</p>
            <ol>
                <li><strong>Compute:</strong> Calculate hashes using multiple algorithms simultaneously</li>
                <li><strong>Avalanche Effect:</strong> See how changing one bit affects the output</li>
                <li><strong>Birthday Attack:</strong> Understand collision probability and security</li>
                <li><strong>Security Analysis:</strong> Learn about hash function properties and vulnerabilities</li>
        </ol>
        ${DisplayComponents.createEducationalNote(
            'This tool demonstrates both secure (SHA-256, SHA-3) and broken (MD5, SHA-1) hash functions. ' +
            'The broken algorithms are included for educational comparison only.'
        )}
        </div>
        `;
    }
}
