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
 * ============================================================================
 */

// Global state
let currentHashes = {};
let lastInput = '';

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

/**
 * Check if required libraries are loaded
 */
function checkDependencies() {
    if (!HashCore.isCryptoJSAvailable()) {
        console.warn('⚠️ CryptoJS not loaded. MD5 and SHA-3 will not be available.');
        showWarning('Some hash functions (MD5, SHA-3) require CryptoJS library.');
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Hash computation
    const computeBtn = document.getElementById('compute-hash-btn');
    if (computeBtn) {
        computeBtn.addEventListener('click', handleComputeHash);
    }

    // Real-time input (optional)
    const hashInput = document.getElementById('hash-input');
    if (hashInput) {
        hashInput.addEventListener('input', debounce(handleComputeHash, 500));
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

    // Copy buttons
    setupCopyButtons();

    // Tab switching
    setupTabs();
}

/**
 * Handle hash computation
 */
async function handleComputeHash() {
    const input = document.getElementById('hash-input').value;
    const selectedAlgos = getSelectedAlgorithms();

    if (!input) {
        showError('Please enter text to hash');
        return;
    }

    if (selectedAlgos.length === 0) {
        showError('Please select at least one hash algorithm');
        return;
    }

    // Clear previous results
    clearResults('hash-results');

    // Show loading indicator
    showLoading('hash-results');

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
        showError('Hash computation failed: ' + error.message);
    } finally {
        hideLoading('hash-results');
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
    const resultsDiv = document.getElementById('hash-results');
    resultsDiv.style.display = 'block';

    let html = `
    <div class="hash-results-container">
        <h3>✓ Hash Computation Complete (${totalTime}ms)</h3>

        <div class="input-display">
            <h4>Input</h4>
            <p class="input-text">"${escapeHtml(input)}"</p>
            <p class="input-info">Length: ${input.length} characters (${new Blob([input]).size} bytes)</p>
        </div>

        <div class="hash-outputs">
    `;

    // Display each algorithm's result
    for (const [algo, data] of Object.entries(results)) {
        const info = HashCore.getAlgorithmInfo(algo);
        const binary = HashUtils.hexToBinary(data.hash);

        html += `
            <div class="hash-output">
                <h4>${info.status} ${info.name} <span class="security-badge">${info.security}</span></h4>
                <div class="hash-details">
                    <div class="hash-value">
                        <label>Hash (Hex):</label>
                        <code id="hash-${algo}">${data.hash}</code>
                        <button class="copy-btn" data-copy="hash-${algo}">Copy</button>
                    </div>
                <div class="hash-metadata">
                    <p><strong>Output size:</strong> ${info.outputBits} bits (${info.outputBits / 8} bytes)</p>
                    <p><strong>Computation time:</strong> ${data.time}ms</p>
                    <p><strong>Status:</strong> ${info.usage}</p>
                </div>
                <details class="hash-binary">
                    <summary>View as binary (${binary.length} bits)</summary>
                    <code class="binary-display">${formatBinary(binary)}</code>
                </details>
            </div>
        </div>
        `;
    }

    html += `
    </div>
    </div>
    `;

    resultsDiv.innerHTML = html;
    setupCopyButtons();
}

/**
 * Handle avalanche effect demonstration
 */
async function handleAvalanche() {
    const baseInput = document.getElementById('avalanche-input').value;
    const algorithm = document.getElementById('avalanche-algorithm').value;

    if (!baseInput) {
        showError('Please enter base text for avalanche test');
        return;
    }

    clearResults('avalanche-results');
    showLoading('avalanche-results');

    try {
        // Compute hash of original input
        const originalHash = await HashCore.computeHash(baseInput, algorithm);

        // Create modified input (change last bit)
        const modifiedInput = baseInput.slice(0, -1) +
            String.fromCharCode(
                // The following condition prevents the presence of the non-printable character DEL
                // Notice: Still one and only one bit flipped
                baseInput.charAt(baseInput.length - 1) === '~' ? 124       // ASCII for '|'
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
        showError('Avalanche test failed: ' + error.message);
    } finally {
        hideLoading('avalanche-results');
    }
}

/**
 * Display avalanche effect results
 */
function displayAvalancheResults(original, modified, hash1, hash2, avalanche, algorithm) {
    const resultsDiv = document.getElementById('avalanche-results');
    resultsDiv.style.display = 'block';

    const binary1 = HashUtils.hexToBinary(hash1);
    const binary2 = HashUtils.hexToBinary(hash2);
    const bitDiff = HashUtils.generateBitDiff(binary1, binary2);

    const info = HashCore.getAlgorithmInfo(algorithm);

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

    let html = `
    <div class="avalanche-container">
        <h3>✓ Avalanche Effect Analysis</h3>
        <p class="algorithm-name">Algorithm: ${info.name}</p>

            <div class="comparison-section">
                <div class="comparison-item">
                    <h4>Original Input</h4>
                    <code class="input-display">"${escapeHtml(original)}"</code>
                    <p class="hash-label">Hash:</p>
                    <code class="hash-small">${hash1}</code>
                </div>

                <div class="comparison-arrow">→</div>

                <div class="comparison-item">
                    <h4>Modified Input <span class="change-indicator">(last bit flipped)</span></h4>
                    <code class="input-display">"${escapeHtml(modified)}"</code>
                    <p class="hash-label">Hash:</p>
                    <code class="hash-small">${hash2}</code>
                </div>
            </div>

            <div class="avalanche-stats">
                <h4>Avalanche Statistics</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-value" style="color: ${color}">${avalanche.flipped}</span>
                        <span class="stat-label">Bits Flipped</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${avalanche.total}</span>
                        <span class="stat-label">Total Bits</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" style="color: ${color}">${avalanche.percentage}%</span>
                        <span class="stat-label">Percentage</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" style="color: ${color}">${quality}</span>
                        <span class="stat-label">Quality</span>
                    </div>
                </div>
                <p class="avalanche-explanation">
                    <strong>Ideal avalanche:</strong> ~50% of bits flip when input changes by 1 bit.
                    This indicates good diffusion (no correlation between input and output).
                </p>
            </div>

            <div class="bit-visualization">
                <h4>Bit-Level Comparison</h4>
                <div class="bit-diff-display">
                    ${renderBitDiff(bitDiff)}
                </div>
            <div class="bit-legend">
                <span class="legend-item"><span class="bit-same">█</span> Same bit</span>
                    <span class="legend-item"><span class="bit-different">█</span> Flipped bit</span>
            </div>
        </div>
    </div>
    `;

    resultsDiv.innerHTML = html;
}

/**
 * Render bit difference visualization
 */
function renderBitDiff(bitDiff) {
    let html = '';
    const bitsPerRow = 64;

    for (let i = 0; i < bitDiff.length; i += bitsPerRow) {
        const row = bitDiff.slice(i, i + bitsPerRow);
        html += '<div class="bit-row">';

        for (const bitInfo of row) {
            const className = bitInfo.status === 'same' ? 'bit-same' : 'bit-different';
            html += `<span class="${className}" title="Bit ${bitInfo.position}: ${bitInfo.bit}">${bitInfo.bit}</span>`;
        }

        html += '</div>';
    }

    return html;
}

/**
 * Handle birthday attack calculator
 */
function handleBirthdayCalculator() {
    const algorithm = document.getElementById('birthday-algorithm').value;
    const info = HashCore.getAlgorithmInfo(algorithm);

    if (!info) {
        showError('Invalid algorithm selected');
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
    ].map(item => ({
        ...item,
        probability: (HashUtils.birthdayAttackProbability(hashBits, item.attempts) * 100)
    }));
    displayBirthdayResults(info, attempts50, probabilities);
}

/**
 * Display birthday attack calculator results
 */
function displayBirthdayResults(info, attempts50, probabilities) {
    const resultsDiv = document.getElementById('birthday-results');
    resultsDiv.style.display = 'block';

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

            <table class="probability-table">
                <thead>
                    <tr>
                        <th>Attempts</th>
                        <th>Collision Probability</th>
                        <th>Security Assessment</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const prob of probabilities) {
        const percentage = parseFloat(prob.probability);
        let assessment;
        if (percentage < 0.000001) {
            assessment = '<span class="secure">✅ Effectively Impossible</span>';
        } else if (percentage < 0.01) {
            assessment = '<span class="secure">✅ Highly Secure</span>';
        } else if (percentage < 10) {
            assessment = '<span class="warning">⚠️ Possible with Resources</span>';
        } else {
            assessment = '<span class="insecure">⛔ Practical Attack</span>';
        }

        html += `
                <tr>
                    <td>${prob.label}</td>
                    <td>${
                        prob.probability >= 0.01 ? prob.probability.toFixed(2)
                            : prob.probability >= 0.000001 ? prob.probability.toFixed(6)
                            : " < 1e-6"
                    }%</td>
                    <td>${assessment}</td>
                </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>

        <div class="real-world-context">
            <h4>Real-World Context</h4>
            <p>
                <strong>Bitcoin mining:</strong> ~500 exahashes/second globally
                (500 × 10^18 hashes/second)
            </p>
            <p>
                <strong>Time to 50% collision for ${info.name}  (assume 1 billion hashes/second):</strong>
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

        resultsDiv.innerHTML = html;
}

/**
 * Estimate time to find collision
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

/**
 * Format binary string for display (groups of 8)
 */
function formatBinary(binary) {
    let formatted = '';
    for (let i = 0; i < binary.length; i += 8) {
        formatted += binary.substring(i, i + 8) + ' ';
    }
    return formatted.trim();
}

/**
 * Setup copy-to-clipboard functionality
 */
function setupCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-copy');
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const text = targetElement.textContent;

                navigator.clipboard.writeText(text).then(() => {
                    const originalText = this.textContent;
                    this.textContent = '✓ Copied!';
                    this.classList.add('copied');

                    setTimeout(() => {
                        this.textContent = originalText;
                        this.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    showError('Failed to copy to clipboard');
                });
            }
        });
    });
}

/**
 * Setup tab switching
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

/**
 * Display welcome message
 */
function displayWelcomeMessage() {
    // Welcome message is in HTML
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Show warning message
 */
function showWarning(message) {
    console.warn(message);
    // Could display in UI if needed
}

/**
 * Show loading indicator
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Computing hashes...</div>';
        element.style.display = 'block';
    }
}

/**
 * Hide loading indicator
 */
function hideLoading(elementId) {
    // Loading will be replaced by results
}

/**
 * Clear results
 */
function clearResults(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        element.style.display = 'none';
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function (for real-time input)
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
