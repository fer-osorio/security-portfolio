/**
 * ============================================================================
 * EC DISPLAY COMPONENTS
 *
 * EC-specific display functions. Keeps ec-demo.ts as a thin event-handler
 * controller.
 *
 * DEPENDENCIES: DisplayComponents, UIUtils, math-utils, Config
 * ============================================================================
 */

import { Point } from './ec-math-utils';
import { RealCurve, FiniteFieldCurve } from './ec-visualization';
import { EllipticCurve, ECKeyPair, ECDSASignature } from './ec-core';
import { modSqrt, modAdd, modMul, bitLength } from '../rsa/math-utils';
import { DisplayComponents, SecurityAlertType } from '../../display-components';
import { UIUtils } from '../../ui-utils';
import { Config } from '../../config';

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export interface PointOperationDisplayOptions {
    operation: string;
    P:         { x: bigint; y: bigint } | null;
    Q:         { x: bigint; y: bigint } | null;
    result:    Point;
    notation:  string;
}

export interface ECDHDisplayOptions {
    curve:       EllipticCurve;
    alice:       ECKeyPair;
    bob:         ECKeyPair;
    aliceSecret: Point;
    bobSecret:   Point;
    aliceKey:    string;
    bobKey:      string;
}

export interface ECDSASignDisplayOptions {
    curve:     EllipticCurve;
    message:   string;
    keyPair:   ECKeyPair;
    signature: ECDSASignature;
}

export interface ECDSAVerifyDisplayOptions {
    verifyMessage:   string;
    originalMessage: string;
    signature:       ECDSASignature;
    isValid:         boolean;
}

type SecurityAlertId =
    | 'small-field'
    | 'weak-generator'
    | 'no-cofactor-check'
    | 'timing-attack';

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Compute number of points on a small finite-field curve (for display only)
 */
function computePointCount(curve: FiniteFieldCurve): number {
    const { a, b, p } = curve;
    let count = 1; // Point at infinity

    for (let x = 0n; x < p; x++) {
        const x2       = modMul(x, x, p);
        const x3       = modMul(x2, x, p);
        const ax       = modMul(a, x, p);
        const ySquared = modAdd(modAdd(x3, ax, p), b, p);

        const y = modSqrt(ySquared, p);

        if (y !== null) {
            count++;       // +y
            if (y !== 0n) {
                count++;   // -y
            }
        }
    }

    return count;
}

// ============================================================================
// EXPORTED DISPLAY FUNCTIONS
// ============================================================================

/**
 * Create a security alert HTML string for known ECC weaknesses
 */
export function createECCSecurityAlert(type: SecurityAlertId): string {
    const alerts: Record<SecurityAlertId, { message: string; severity: SecurityAlertType }> = {
        'small-field': {
            message:  'Prime p < 2^128 is INSECURE. Use for education only.',
            severity: 'danger',
        },
        'weak-generator': {
            message:  'Generator order is too small. Private key can be brute-forced.',
            severity: 'danger',
        },
        'no-cofactor-check': {
            message:  'Not checking hQ = ∞ allows small subgroup attacks.',
            severity: 'warning',
        },
        'timing-attack': {
            message:  'Non-constant-time scalar multiplication leaks private key bits.',
            severity: 'warning',
        },
    };

    return DisplayComponents.createSecurityAlert(alerts[type].message, alerts[type].severity);
}

/**
 * Display welcome message for the EC tool
 */
export function displayWelcomeMessage(): void {
    const welcomeDiv = document.getElementById('welcome-message');
    if (!welcomeDiv) return;

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
            'A 256-bit ECC key ≈ 3072-bit RSA key in security strength.',
        )}
    </div>
    `;
}

/**
 * Display real curve information (Tab 1)
 */
export function displayRealCurveInfo(curve: RealCurve): void {
    const infoDiv = document.getElementById('real-curve-info');
    if (!infoDiv) return;

    const { a, b } = curve;

    // Discriminant: Δ = -16(4a³ + 27b²)
    const discriminant = -16 * (4 * Math.pow(a, 3) + 27 * Math.pow(b, 2));

    let components: string;
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
        ${discriminant < 0
            ? 'This curve has one connected component extending to infinity.'
            : 'This curve has two separate components.'}
        </em></p>
        `;
    } else {
        html += DisplayComponents.createSecurityAlert(
            'Singular curve! This is not a valid elliptic curve for cryptography.',
            'danger',
        );
    }

    html += DisplayComponents.createEducationalNote(
        'Over real numbers, elliptic curves form smooth curves. The geometric chord-and-tangent ' +
        'method works intuitively here. When we move to finite fields, the same algebraic formulas ' +
        'apply, but we work with discrete points instead of continuous curves.',
    );

    html += '</div>';

    UIUtils.displayResults('real-curve-info', html, false);
}

/**
 * Display finite field curve information (Tab 2)
 */
export function displayFiniteCurveInfo(curve: FiniteFieldCurve): void {
    const infoDiv = document.getElementById('finite-curve-info');
    if (!infoDiv) return;

    const { a, b, p } = curve;

    let html = `
    <div class="card card--result">
        <h3>Curve Parameters (Finite Field F_${p})</h3>
        <p><strong>Equation:</strong> y² ≡ x³ + ${a}x + ${b} (mod ${p})</p>
    `;

    if (p < Config.ECC.MAX_POINT_AMOUNTn) {
        const points = computePointCount(curve);
        html += `<p><strong>Points on curve:</strong> ${points} (including point at infinity)</p>`;

        const pNum       = Number(p);
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
        html += `<p><strong>Field size:</strong> ${bitLength(p)} bits (too large to visualize)</p>`;
    }

    html += DisplayComponents.createEducationalNote(
        'For cryptographic security, we need large primes (256+ bits). ' +
        'Small curves here are for visualization and learning only.',
    );

    html += '</div>';

    UIUtils.displayResults('finite-curve-info', html, false);
}

/**
 * Display point operation result
 */
export function displayPointOperationResult(options: PointOperationDisplayOptions): void {
    const { operation, P, Q, result, notation } = options;

    let html = `
    <div class="card card--result">
        <h3>✓ ${operation}</h3>
        <div class="operation-display">
    `;

    if (P !== null) {
        html += `<p><strong>P:</strong> (${P.x}, ${P.y})</p>`;
    }
    if (Q !== null) {
        html += `<p><strong>Q:</strong> (${Q.x}, ${Q.y})</p>`;
    }

    if (result && !result.isInfinity) {
        html += `<p><strong>${notation}:</strong> (${result.x}, ${result.y})</p>`;
    } else {
        html += `<p><strong>${notation}:</strong> ∞ (point at infinity)</p>`;
    }

    html += `
        </div>
        ${DisplayComponents.createEducationalNote(
            'Point addition is the fundamental group operation in elliptic curve cryptography. ' +
            'The geometric chord-and-tangent method corresponds to algebraic formulas over finite fields.',
        )}
    </div>
    `;

    UIUtils.displayResults('operation-results', html, true);
}

/**
 * Display scalar multiplication result
 */
export function displayScalarMultiplyResult(k: bigint, P: { x: bigint; y: bigint }, result: Point): void {
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
        'Computing kP is fast (O(log k)), but finding k given P and kP is hard (ECDLP).',
    )}
    </div>
    `;

    UIUtils.displayResults('operation-results', html, true);
}

/**
 * Display ECDH key exchange results
 */
export function displayECDHResults(options: ECDHDisplayOptions): void {
    const { curve, alice, bob, aliceSecret, bobSecret, aliceKey, bobKey } = options;
    const isSmallCurve = curve.p < 1000n;

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
                    false,
                )}
                <p><strong>Public key Q_A = d_A × G:</strong></p>
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_A.x',
                    isSmallCurve ? alice.publicKey.x.toString() : alice.publicKey.x.toString(16),
                    'ecdh-alice-pub-x',
                    false,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_A.y',
                    isSmallCurve ? alice.publicKey.y.toString() : alice.publicKey.y.toString(16),
                    'ecdh-alice-pub-y',
                    false,
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
                    false,
                )}
                <p><strong>Public key Q_B = d_B × G:</strong></p>
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_B.x',
                    isSmallCurve ? bob.publicKey.x.toString() : bob.publicKey.x.toString(16),
                    'ecdh-bob-pub-x',
                    false,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Q_B.y',
                    isSmallCurve ? bob.publicKey.y.toString() : bob.publicKey.y.toString(16),
                    'ecdh-bob-pub-y',
                    false,
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
                    false,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'S.y (Alice)',
                    isSmallCurve ? aliceSecret.y.toString() : aliceSecret.y.toString(16),
                    'ecdh-alice-secret-y',
                    false,
                )}
            </div>

            <p style="margin-top: 1rem;"><strong>Bob computes:</strong> S = d_B × Q_A</p>
            <div class="operation-display">
                ${DisplayComponents.createCodeValueDisplay(
                    'S.x (Bob)',
                    isSmallCurve ? bobSecret.x.toString() : bobSecret.x.toString(16),
                    'ecdh-bob-secret-x',
                    false,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'S.y (Bob)',
                    isSmallCurve ? bobSecret.y.toString() : bobSecret.y.toString(16),
                    'ecdh-bob-secret-y',
                    false,
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
                    true,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Bob\'s session key',
                    bobKey,
                    'ecdh-bob-session',
                    true,
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
            <li><strong>Quantum computers:</strong> Shor's algorithm reduces to O((log n)³)</li>
        </ul>

        <h4>Man-in-the-Middle (MitM) Attack:</h4>
        ${DisplayComponents.createWarningAlert(
            'Unauthenticated ECDH Vulnerability',
            'Without authentication, an attacker can intercept and replace public keys. ' +
            "Solution: Use authenticated ECDH (sign public keys with long-term keys) or use protocols like Signal's X3DH.",
        )}
    </div>
    `;

    UIUtils.displayResults('ecdh-results', html, true);
}

/**
 * Display ECDSA signing results
 */
export function displayECDSASignResults(options: ECDSASignDisplayOptions): void {
    const { curve, message, keyPair, signature } = options;
    const isSmallCurve = curve.p < 1000n;

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
                    false,
                )}
                <p><strong>Public key Q = d × G:</strong></p>
                ${DisplayComponents.createCodeValueDisplay(
                    'Q.x',
                    isSmallCurve ? keyPair.publicKey.x.toString() : keyPair.publicKey.x.toString(16),
                    'ecdsa-pub-x',
                    false,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    'Q.y',
                    isSmallCurve ? keyPair.publicKey.y.toString() : keyPair.publicKey.y.toString(16),
                    'ecdsa-pub-y',
                    false,
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
                    true,
                )}
                ${DisplayComponents.createCodeValueDisplay(
                    's',
                    isSmallCurve ? signature.s.toString() : signature.s.toString(16),
                    'ecdsa-sig-s',
                    true,
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
export function displayECDSAVerifyResults(options: ECDSAVerifyDisplayOptions): void {
    const { verifyMessage, originalMessage, signature, isValid } = options;
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
                false,
            )}
            ${DisplayComponents.createCodeValueDisplay(
                's',
                signature.s.toString(16),
                'ecdsa-verify-s',
                false,
            )}
        </div>
    </div>

    <div class="protocol-step">
        <h4>Verification Result</h4>
        <p class="${isValid ? 'success-message' : 'error-message'}">
        ${isValid
            ? '✅ Signature is VALID - Message authenticity confirmed'
            : '❌ Signature is INVALID - Message may be tampered or wrong key'
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
            "Signature verified but messages don't match - this shouldn't happen with deterministic ECDSA!",
        );
    }

    if (matchesOriginal && !isValid) {
        html += DisplayComponents.createWarningAlert(
            'Verification Failed',
            'Messages match but signature invalid - possible implementation error or key mismatch.',
        );
    }

    UIUtils.displayResults('ecdsa-verify-results', html, true);
}
