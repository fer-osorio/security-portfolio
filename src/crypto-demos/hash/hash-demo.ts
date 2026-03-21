/**
 * ============================================================================
 * HASH FUNCTION VISUALIZER - UI CONTROLLER
 *
 * Handles user interactions and DOM updates for the hash function tool.
 *
 * ARCHITECTURE: MVC pattern
 * - Model: hash-core.ts (hash computations)
 * - View: hash-tool.html (DOM structure)
 * - Controller: this file (event handling, UI updates)
 * ============================================================================
 */

import { SupportedAlgorithm, computeHash, isCryptoJSAvailable } from './hash-core';
import {
    createHashOutputDisplay,
    createAvalancheSummary,
    createBirthdayProbabilityTable,
    AvalancheQuality,
    ProbabilityRow,
} from './hash-display';
import {
    computeAvalanche,
    hexToBinary,
    generateBitDiff,
    attemptsFor50PercentCollision,
    birthdayAttackProbability,
    formatLargeNumber,
    AvalancheResult,
} from './hash-utils';
import { DisplayComponents } from '../../display-components';
import { UIUtils } from '../../ui-utils';
import { Config, AlgorithmInfo } from '../../config';

// ============================================================================
// MODULE STATE
// ============================================================================

let lastInput: string = '';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Hash Visualizer initialized');

    checkDependencies();
    setupEventListeners();
    displayWelcomeMessage();
});

// ============================================================================
// DEPENDENCY CHECKING
// ============================================================================

function checkDependencies(): void {
    if (!isCryptoJSAvailable()) {
        console.warn('CryptoJS not loaded. MD5 and SHA-3 will not be available.');
        UIUtils.showWarning('Some hash functions (MD5, SHA-3) require CryptoJS library.');
    }
}

// ============================================================================
// EVENT HANDLER SETUP
// ============================================================================

function setupEventListeners(): void {
    const computeBtn = document.getElementById('compute-hash-btn');
    if (computeBtn) {
        computeBtn.addEventListener('click', handleComputeHash);
    }

    const avalancheBtn = document.getElementById('avalanche-btn');
    if (avalancheBtn) {
        avalancheBtn.addEventListener('click', handleAvalanche);
    }

    const birthdayBtn = document.getElementById('birthday-calc-btn');
    if (birthdayBtn) {
        birthdayBtn.addEventListener('click', handleBirthdayCalculator);
    }

    UIUtils.setupCopyButtons();
    UIUtils.setupTabs();
}

// ============================================================================
// HASH COMPUTATION
// ============================================================================

async function handleComputeHash(): Promise<void> {
    const inputEl = document.getElementById('hash-input') as HTMLInputElement | null;
    if (!inputEl) return;

    const input = inputEl.value;
    const selectedAlgos = getSelectedAlgorithms();

    if (!input) {
        UIUtils.showError('Please enter text to hash');
        return;
    }

    if (selectedAlgos.length === 0) {
        UIUtils.showError('Please select at least one hash algorithm');
        return;
    }

    UIUtils.clearResults('hash-results');
    UIUtils.showLoading('hash-results', 'Computing hashes...');

    try {
        const startTime = performance.now();
        const results: Record<string, { hash: string; time: string }> = {};

        for (const algo of selectedAlgos) {
            const algoStartTime = performance.now();
            const hash = await computeHash(input, algo);
            const algoEndTime = performance.now();

            results[algo] = {
                hash,
                time: (algoEndTime - algoStartTime).toFixed(2)
            };
        }

        const endTime = performance.now();
        const totalTime = (endTime - startTime).toFixed(2);

        lastInput = input;

        displayHashResults(input, results, totalTime);

    } catch (error) {
        console.error('Hash computation failed:', error);
        UIUtils.showError('Hash computation failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('hash-results');
    }
}

function getSelectedAlgorithms(): SupportedAlgorithm[] {
    const checkboxes = document.querySelectorAll('input[name="hash-algorithm"]:checked');
    // DOM values are set by the HTML author and are trusted to be valid algorithm names
    return Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value as SupportedAlgorithm);
}

function displayHashResults(
    input: string,
    results: Record<string, { hash: string; time: string }>,
    totalTime: string
): void {
    let html = `
    <div class="hash-results-container">
        <h3>Hash Computation Complete (${totalTime}ms)</h3>

        <div class="input-display">
            <h4>Input</h4>
            <p class="input-text">"${UIUtils.escapeHtml(input)}"</p>
            <p class="input-info">Length: ${input.length} characters (${new Blob([input]).size} bytes)</p>
        </div>

    <div class="hash-outputs">
    `;

    for (const [algo, data] of Object.entries(results)) {
        html += createHashOutputDisplay({
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
// AVALANCHE EFFECT
// ============================================================================

async function handleAvalanche(): Promise<void> {
    const baseInputEl  = document.getElementById('avalanche-input')     as HTMLInputElement  | null;
    const algorithmEl  = document.getElementById('avalanche-algorithm') as HTMLSelectElement | null;
    if (!baseInputEl || !algorithmEl) return;

    // Pre-fill from last hash input if the field is blank
    if (!baseInputEl.value && lastInput) {
        baseInputEl.value = lastInput;
    }

    const baseInput = baseInputEl.value;
    const algorithm = algorithmEl.value as SupportedAlgorithm;

    if (!baseInput) {
        UIUtils.showError('Please enter base text for avalanche test');
        return;
    }

    UIUtils.clearResults('avalanche-results');
    UIUtils.showLoading('avalanche-results', 'Computing avalanche effect...');

    try {
        const originalHash = await computeHash(baseInput, algorithm);

        // Flip last bit, avoiding the non-printable DEL character
        const modifiedInput = baseInput.slice(0, -1) +
            String.fromCharCode(
                baseInput.charAt(baseInput.length - 1) === '~' ? 124
                : baseInput.charCodeAt(baseInput.length - 1) ^ 1
            );

        const modifiedHash = await computeHash(modifiedInput, algorithm);

        const avalanche = computeAvalanche(originalHash, modifiedHash);

        displayAvalancheResults(baseInput, modifiedInput, originalHash, modifiedHash, avalanche, algorithm);

    } catch (error) {
        console.error('Avalanche test failed:', error);
        UIUtils.showError('Avalanche test failed: ' + (error as Error).message);
    } finally {
        UIUtils.hideLoading('avalanche-results');
    }
}

function displayAvalancheResults(
    original: string,
    modified: string,
    hash1: string,
    hash2: string,
    avalanche: AvalancheResult,
    algorithm: string
): void {
    const info: AlgorithmInfo | null = Config.getAlgorithmInfo(algorithm);
    if (!info) {
        UIUtils.showError('Unknown algorithm: ' + algorithm);
        return;
    }

    const binary1 = hexToBinary(hash1);
    const binary2 = hexToBinary(hash2);
    const bitDiff = generateBitDiff(binary1, binary2);

    const percentage = parseFloat(avalanche.percentage);
    let quality: AvalancheQuality;

    if (percentage >= 45 && percentage <= 55) {
        quality = 'Excellent';
    } else if (percentage >= 40 && percentage <= 60) {
        quality = 'Good';
    } else {
        quality = 'Poor';
    }

    let html = `
    <div class="avalanche-container">
        <h3>Avalanche Effect Analysis</h3>
        <p class="algorithm-name">Algorithm: ${UIUtils.escapeHtml(info.name)}</p>
    `;

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

    html += createAvalancheSummary(avalanche, quality);

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
// BIRTHDAY ATTACK CALCULATOR
// ============================================================================

function handleBirthdayCalculator(): void {
    const algorithmEl = document.getElementById('birthday-algorithm') as HTMLSelectElement | null;
    if (!algorithmEl) return;

    const algorithm = algorithmEl.value;
    const info: AlgorithmInfo | null = Config.getAlgorithmInfo(algorithm);

    if (!info) {
        UIUtils.showError('Invalid algorithm selected');
        return;
    }

    const hashBits = info.outputBits;
    const attempts50 = attemptsFor50PercentCollision(hashBits);

    const probabilities = [
        { attempts: Math.pow(2, hashBits / 4),     label: `2^${hashBits / 4}` },
        { attempts: Math.pow(2, hashBits / 3),     label: `2^${(hashBits / 3).toFixed(1)}` },
        { attempts: Math.pow(2, hashBits / 2),     label: `2^${hashBits / 2}` },
        { attempts: Math.pow(2, hashBits / 1.5),   label: `2^${(hashBits / 1.5).toFixed(1)}` }
    ].map(item => {
        const probability = birthdayAttackProbability(hashBits, item.attempts) * 100;

        let assessment: string;
        if (probability < 0.000001) {
            assessment = '<span class="secure">Effectively Impossible</span>';
        } else if (probability < 0.01) {
            assessment = '<span class="secure">Highly Secure</span>';
        } else if (probability < 10) {
            assessment = '<span class="warning">Possible with Resources</span>';
        } else {
            assessment = '<span class="insecure">Practical Attack</span>';
        }

        return { ...item, probability, assessment };
    });

    displayBirthdayResults(info, attempts50, probabilities);
}

function displayBirthdayResults(
    info: AlgorithmInfo,
    attempts50: string,
    probabilities: ProbabilityRow[]
): void {
    let html = `
    <div class="birthday-container">
        <h3>Birthday Attack Analysis</h3>
        <p class="algorithm-name">Algorithm: ${UIUtils.escapeHtml(info.name)} (${info.outputBits}-bit output)</p>

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

            ${createBirthdayProbabilityTable(probabilities)}
        </div>

        <div class="real-world-context">
            <h4>Real-World Context</h4>
            <p>
                <strong>Bitcoin mining:</strong> ~500 exahashes/second globally
                (500 x 10^18 hashes/second)
            </p>
            <p>
                <strong>Time to 50% collision for ${UIUtils.escapeHtml(info.name)} (assume 1 billion hashes/second):</strong>
                ${estimateCollisionTime(info.outputBits)} years
            </p>
            <p class="conclusion">
                ${info.outputBits >= 256 ?
                'Collision-resistant in practice (more time than age of universe)' :
                'May be vulnerable with sufficient computational resources'}
            </p>
        </div>
    </div>
    `;

    UIUtils.displayResults('birthday-results', html, true);
}

/**
 * Estimate years to find collision at 1 billion hashes/second
 */
function estimateCollisionTime(hashBits: number): string {
    const hashesPerSecond = 1e9;
    const attemptsNeeded = Math.pow(2, hashBits / 2);
    const secondsNeeded = attemptsNeeded / hashesPerSecond;
    const yearsNeeded = secondsNeeded / (365.25 * 24 * 3600);

    if (yearsNeeded > 1e20) {
        return '> 10^20 (far exceeds age of universe)';
    } else if (yearsNeeded > 1e10) {
        return yearsNeeded.toExponential(2);
    } else {
        return formatLargeNumber(yearsNeeded);
    }
}

// ============================================================================
// WELCOME MESSAGE
// ============================================================================

function displayWelcomeMessage(): void {
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

export {};
